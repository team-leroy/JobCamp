import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/prisma';

export const load : PageServerLoad = async ({ locals }) => {
    const loggedIn = locals.user != null;
    
    if (loggedIn) {
        // redirect(302, "/dashboard")
    }

    let isHost = false;
    let isAdmin = false;
    if (locals.user) {
        isHost = locals.user.host != null;
        isAdmin = locals.user.adminOfSchools?.length > 0 || false;
    }

    // Check if there's an active and enabled event for the season
    const activeEvent = await prisma.event.findFirst({
        where: {
            isActive: true
        }
    });

    const eventEnabled = activeEvent?.eventEnabled ?? false;
    const studentAccountsEnabled = activeEvent?.studentAccountsEnabled ?? false;
    const companyAccountsEnabled = activeEvent?.companyAccountsEnabled ?? false;
    const seasonActive = activeEvent && eventEnabled;

    // Determine if signup/login should be shown
    const showSignupLogin = seasonActive && (studentAccountsEnabled || companyAccountsEnabled);

    return { 
        isHost, 
        loggedIn, 
        isAdmin,
        seasonActive,
        eventEnabled,
        hasActiveEvent: !!activeEvent,
        eventName: activeEvent?.name || null,
        studentAccountsEnabled,
        companyAccountsEnabled,
        showSignupLogin
    };
};