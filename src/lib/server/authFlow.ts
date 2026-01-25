import { redirect } from "@sveltejs/kit";
import { getPermissionSlipStatus } from "./permissionSlips";
import { needsContactInfoVerification } from "./contactInfoVerification";

export enum PageType {
    NonAuth,
    Login,
    AccountCreation,
    EmailVerify,
    ContactInfoVerify,
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
        // Check if contact info verification is needed for the active event
        const contactInfoVerificationNeeded = await needsContactInfoVerification(
            locals.user.student.id,
            locals.user.student.schoolId
        );

        if (contactInfoVerificationNeeded && pageType != PageType.ContactInfoVerify) {
            redirect(302, "/verify-contact-info");
        } else if (!contactInfoVerificationNeeded && pageType == PageType.ContactInfoVerify) {
            redirect(302, "/dashboard");
        }

        // Check permission slip status for the active event
        const permissionSlipStatus = await getPermissionSlipStatus(
            locals.user.student.id, 
            locals.user.student.schoolId!
        );
        
        const permissionSlipNeeded = permissionSlipStatus.hasActiveEvent && !permissionSlipStatus.hasPermissionSlip;
        
        // We no longer force students to the permission slip page. They can browse positions
        // without it, but cannot select favorites.
        if (!permissionSlipNeeded && pageType == PageType.PermissionSlip) {
            redirect(302, "/dashboard");
        }
    }

    return;
}