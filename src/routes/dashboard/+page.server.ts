import { fail, redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";
import { lucia } from "$lib/server/auth";
import type { PageServerLoad } from "./$types";
import { prisma } from "$lib/server/prisma";

interface UserData {
    userInfo: {
        id: string;
        adminOfSchools: Array<{ id: string }>;
    };
    hostInfo: {
        id: string;
        userId: string;
    } | null;
}

const grabUserData = async (locals: App.Locals): Promise<UserData> => {
    if (!locals.user) {
        redirect(302, "/login");
    }

    const userInfo = await prisma.user.findFirst({
        where: { id: locals.user.id },
        include: {
            adminOfSchools: true,
        }
    });
    if (!userInfo) {
        redirect(302, "/lghs")
    }
    
    const hostInfo = await prisma.host.findFirst({
        where: { userId: userInfo.id }
    });
    return { userInfo, hostInfo }
}

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        redirect(302, "/login");
    }
    if (!locals.user.emailVerified) {
        redirect(302, "/verify-email");
    }

    const { userInfo, hostInfo } = await grabUserData(locals);

    // Check event controls for access permissions
    const activeEvent = await prisma.event.findFirst({
        where: {
            isActive: true
        }
    });

    const studentAccountsEnabled = activeEvent?.studentAccountsEnabled ?? false;
    const companyAccountsEnabled = activeEvent?.companyAccountsEnabled ?? false;
    const companySignupsEnabled = (activeEvent as { companySignupsEnabled?: boolean })?.companySignupsEnabled ?? false;

    if (userInfo.adminOfSchools && userInfo.adminOfSchools.length > 0) {
        redirect(302, "/dashboard/admin");
    }

    if (!hostInfo) {
        // This is a student - check if student accounts are enabled
        if (!studentAccountsEnabled) {
            // Redirect to a "access denied" page or show appropriate message
            return {
                accessDenied: true,
                studentAccountsEnabled,
                companyAccountsEnabled,
                message: "Student accounts are currently disabled. Please contact your administrator."
            };
        }
        redirect(302, "/dashboard/student");
    }

    // This is a company/host - check if company accounts are enabled
    if (!companyAccountsEnabled) {
        return {
            accessDenied: true,
            studentAccountsEnabled,
            companyAccountsEnabled,
            message: "Company accounts are currently disabled. Please contact your administrator."
        };
    }


    const positions = await prisma.position.findMany({
        where: {
            hostId: hostInfo.id,
            eventId: activeEvent?.id
        }, 
        include: { attachments: true }
    });

    // Check if positions were brought forward (unpublished positions exist)
    const hasUnpublishedPositions = positions.some(position => !position.isPublished);

    return { 
        positions, 
        userData: locals.user, 
        isCompany: true,
        companySignupsEnabled,
        eventName: activeEvent?.name || "JobCamp",
        eventDate: activeEvent?.date,
        hasUnpublishedPositions
    };
};

export const actions: Actions = {
    logOut: async ({ locals, cookies }) => {
        // Load user data with admin relationship BEFORE invalidating session
        let isAdmin = false;
        if (locals.user) {
            const userInfo = await prisma.user.findFirst({
                where: { id: locals.user.id },
                include: { adminOfSchools: true }
            });
            isAdmin = (userInfo?.adminOfSchools?.length ?? 0) > 0;
        }
        
        if (locals.session) {
            const session = await lucia.validateSession(locals.session.id);
            if (!session) return fail(401);
            await lucia.invalidateSession(locals.session.id);
            cookies.delete(lucia.sessionCookieName, { path: "." });
        }
        
        // Check if user is an admin and redirect accordingly
        if (isAdmin) {
            // Always redirect admins to admin login, regardless of event controls
            redirect(302, "/admin/login");
        }
        
        redirect(302, "/login");
    },
    deletePosition: async ({ url }) => {
        const positionId = url.searchParams.get("posId")?.toString();
        console.log(`DELETE POSITION: ${positionId}`)
        if (!positionId) {
            redirect(302, "/about")
        }

        await prisma.position.delete({ where: { id: positionId }});
    }
};