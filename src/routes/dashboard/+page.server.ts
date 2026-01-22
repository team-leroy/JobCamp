import { fail, redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";
import { lucia } from "$lib/server/auth";
import type { PageServerLoad } from "./$types";
import { prisma } from "$lib/server/prisma";

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
        console.log("[Dashboard] No user in locals, redirecting to /login");
        redirect(302, "/login");
    }

    try {
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
            console.log(`[Dashboard] User ${locals.user.id} not found in DB, redirecting to /login`);
            redirect(302, "/login");
        }
        
        return { userInfo };
    } catch (e) {
        // If it's a SvelteKit redirect, let it bubble up
        if (e && typeof e === 'object' && 'status' in e && 'location' in e) {
            throw e;
        }
        console.error(`[Dashboard] Database error in grabUserData:`, e);
        throw e;
    }
}

export const load: PageServerLoad = async ({ locals }) => {
    console.log("[Dashboard] Load started");
    if (!locals.user) {
        redirect(302, "/login");
    }

    // 1. Grab User Data
    const { userInfo } = await grabUserData(locals);
    const hostInfo = userInfo.host;
    const studentInfo = userInfo.student;
    
    console.log(`[Dashboard] User ${userInfo.id} loaded. isHost: ${!!hostInfo}, isStudent: ${!!studentInfo}`);

    // 2. Admin Check
    if (userInfo.adminOfSchools && userInfo.adminOfSchools.length > 0) {
        console.log("[Dashboard] User is admin, redirecting to /dashboard/admin");
        redirect(302, "/dashboard/admin");
    }

    // 3. Email Verification
    if (!locals.user.emailVerified) {
        console.log("[Dashboard] Email not verified, redirecting to /verify-email");
        redirect(302, "/verify-email");
    }

    // 4. Identify School and Active Event
    const schoolId = hostInfo?.company?.schoolId || studentInfo?.schoolId;
    console.log(`[Dashboard] schoolId: ${schoolId}`);

    let activeEvent = null;
    if (schoolId) {
        activeEvent = await prisma.event.findFirst({
            where: {
                schoolId,
                isActive: true
            }
        });
    }
    
    if (!activeEvent) {
        // Fallback to any active event if school check failed
        activeEvent = await prisma.event.findFirst({
            where: { isActive: true }
        });
    }
    
    console.log(`[Dashboard] activeEvent: ${activeEvent?.id || 'none'}`);

    const companyName = hostInfo?.company?.companyName || null;
    const studentAccountsEnabled = activeEvent?.studentAccountsEnabled ?? false;
    const companyAccountsEnabled = activeEvent?.companyAccountsEnabled ?? false;
    const companySignupsEnabled = activeEvent?.companySignupsEnabled ?? false;

    // 5. Host vs Student Logic
    if (!hostInfo) {
        if (!studentInfo) {
            console.log("[Dashboard] Neither host nor student record found");
            return {
                accessDenied: true,
                studentAccountsEnabled,
                companyAccountsEnabled,
                message: "We couldn't find a student or company record for your account. Please contact your administrator."
            };
        }

        if (!studentAccountsEnabled) {
            console.log("[Dashboard] Student accounts disabled");
            return {
                accessDenied: true,
                studentAccountsEnabled,
                companyAccountsEnabled,
                message: "Student accounts are currently disabled. Please contact your administrator."
            };
        }

        console.log("[Dashboard] Redirecting to /dashboard/student");
        redirect(302, "/dashboard/student");
    }

    // 6. Company Access Check
    if (!companyAccountsEnabled) {
        console.log("[Dashboard] Company accounts disabled");
        return {
            accessDenied: true,
            studentAccountsEnabled,
            companyAccountsEnabled,
            message: "Company accounts are currently disabled. Please contact your administrator."
        };
    }

    // 7. Load Positions
    const positions = (activeEvent && hostInfo)
        ? await prisma.position.findMany({
            where: {
                hostId: hostInfo.id,
                eventId: activeEvent.id
            },
            include: { attachments: true }
        })
        : [];

    console.log(`[Dashboard] Loaded ${positions.length} positions`);

    const hasUnpublishedPositions = positions.some(position => !position.isPublished);

    // 8. Return Data
    return { 
        positions, 
        userData: {
            id: locals.user.id,
            email: locals.user.email,
            emailVerified: locals.user.emailVerified
        }, 
        isCompany: true,
        companySignupsEnabled,
        eventName: activeEvent?.name || "JobCamp",
        eventDate: activeEvent?.date?.toISOString() || null,
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
    logout: async (event) => {
        return actions.logOut(event);
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