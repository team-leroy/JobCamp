import { fail, redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";
import { lucia } from "$lib/server/auth";
import type { PageServerLoad } from "./$types";
import { prisma } from "$lib/server/prisma";
import { needsContactInfoVerification } from "$lib/server/contactInfoVerification";

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

    // Check if user is admin first - admins can access without email verification
    const { userInfo, hostInfo } = await grabUserData(locals);

    if (userInfo.adminOfSchools && userInfo.adminOfSchools.length > 0) {
        redirect(302, "/dashboard/admin");
    }

    // For non-admin users, check email verification
    if (!locals.user.emailVerified) {
        redirect(302, "/verify-email");
    }

    // Get host with company information for company dashboard
    let companyName: string | null = null;
    if (hostInfo) {
        const hostWithCompany = await prisma.host.findFirst({
            where: { id: hostInfo.id },
            include: { company: true }
        });
        companyName = hostWithCompany?.company?.companyName || null;
    }

    // Check event controls for access permissions
    const activeEvent = await prisma.event.findFirst({
        where: {
            isActive: true
        }
    });

    const studentAccountsEnabled = activeEvent?.studentAccountsEnabled ?? false;
    const companyAccountsEnabled = activeEvent?.companyAccountsEnabled ?? false;
    const companySignupsEnabled = (activeEvent as { companySignupsEnabled?: boolean })?.companySignupsEnabled ?? false;

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

        // Check if contact info verification is needed for the active event
        const student = await prisma.student.findFirst({
            where: { userId: locals.user.id }
        });

        if (student) {
            const contactInfoVerificationNeeded = await needsContactInfoVerification(
                student.id,
                student.schoolId
            );

            if (contactInfoVerificationNeeded) {
                redirect(302, "/verify-contact-info");
            }
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
        hasUnpublishedPositions,
        companyName
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