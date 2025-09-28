import { redirect } from "@sveltejs/kit";
import { getPermissionSlipStatus } from "./permissionSlips";

export enum PageType {
    NonAuth,
    Login,
    AccountCreation,
    EmailVerify,
    PermissionSlip,
    RequiresAuth,
}

export async function userAccountSetupFlow(locals: App.Locals, pageType: PageType) {
    if (pageType == PageType.NonAuth) {
        return;
    }

    if (!locals.user) {
        if (pageType == PageType.AccountCreation || pageType == PageType.Login) {
            return;
        }
        
        redirect(302, "/signup");
    } else {
        if (pageType == PageType.AccountCreation || pageType == PageType.Login) {
            redirect(302, "/");
        }
    }

    if (!locals.user.emailVerified && pageType != PageType.EmailVerify) {
        redirect(302, "/verify-email");
    }

    if (locals.user.student) {
        // Check permission slip status for the active event
        const permissionSlipStatus = await getPermissionSlipStatus(
            locals.user.student.id, 
            locals.user.student.schoolId!
        );
        
        const permissionSlipNeeded = permissionSlipStatus.hasActiveEvent && !permissionSlipStatus.hasPermissionSlip;
        
        if (permissionSlipNeeded && pageType != PageType.PermissionSlip) {
            redirect(302, "/permission-slip");
        } else if (!permissionSlipNeeded && pageType == PageType.PermissionSlip) {
            redirect(302, "/dashboard");
        }
    }

    return;
}