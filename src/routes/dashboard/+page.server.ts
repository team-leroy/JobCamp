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
        host: { id: string; userId: string; company?: { schoolId: string | null } | null } | null;
        student: { id: string; userId: string; schoolId: string | null } | null;
    };
}

const grabUserData = async (locals: App.Locals): Promise<UserData> => {
    if (!locals.user) {
        redirect(302, "/login");
    }

    const userInfo = await prisma.user.findFirst({
        where: { id: locals.user.id },
        include: {
            adminOfSchools: true,
            host: {
                include: {
                    company: true
                }
            },
            student: true
        }
    });

    if (!userInfo) {
        // This shouldn't happen if locals.user exists, but handle it
        redirect(302, "/login");
    }
    
    return { userInfo };
}

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        redirect(302, "/login");
    }

    // Check if user is admin first - admins can access without email verification
    const { userInfo } = await grabUserData(locals);
    const hostInfo = userInfo.host;
    const studentInfo = userInfo.student;

    if (userInfo.adminOfSchools && userInfo.adminOfSchools.length > 0) {
        redirect(302, "/dashboard/admin");
    }

    // For non-admin users, check email verification
    if (!locals.user.emailVerified) {
        redirect(302, "/verify-email");
    }

    // Determine the school ID to find the correct active event
    const schoolId = hostInfo?.company?.schoolId || studentInfo?.schoolId;

    // Check event controls for access permissions
    // If we have a schoolId, we can be more specific. Otherwise, find the first active event.
    const activeEvent = schoolId 
        ? await prisma.event.findFirst({
            where: {
                schoolId,
                isActive: true
            }
        })
        : await prisma.event.findFirst({
            where: {
                isActive: true
            }
        });

    const companyName = hostInfo?.company?.companyName || null;
    const studentAccountsEnabled = activeEvent?.studentAccountsEnabled ?? false;
    const companyAccountsEnabled = activeEvent?.companyAccountsEnabled ?? false;
    const companySignupsEnabled = activeEvent?.companySignupsEnabled ?? false;

    if (!hostInfo) {
        // This is a student (or someone without a host record)
        if (!studentInfo) {
            // No student record either - this is an edge case
            return {
                accessDenied: true,
                studentAccountsEnabled,
                companyAccountsEnabled,
                message: "We couldn't find a student or company record for your account. Please contact your administrator."
            };
        }

        // Check if student accounts are enabled
        if (!studentAccountsEnabled) {
            return {
                accessDenied: true,
                studentAccountsEnabled,
                companyAccountsEnabled,
                message: "Student accounts are currently disabled. Please contact your administrator."
            };
        }

        // Check if contact info verification is needed for the active event
        const contactInfoVerificationNeeded = await needsContactInfoVerification(
            studentInfo.id,
            studentInfo.schoolId
        );

        if (contactInfoVerificationNeeded) {
            redirect(302, "/verify-contact-info");
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

    const positions = activeEvent 
        ? await prisma.position.findMany({
            where: {
                hostId: hostInfo.id,
                eventId: activeEvent.id
            }, 
            include: { attachments: true }
        })
        : [];

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