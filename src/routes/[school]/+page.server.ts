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

    const studentAccountsEnabled = Boolean(activeEvent?.studentAccountsEnabled);
    const companyAccountsEnabled = Boolean(activeEvent?.companyAccountsEnabled);
    const seasonActive = Boolean(activeEvent?.isActive);

    // Determine if signup/login should be shown
    const showSignupLogin = seasonActive && (studentAccountsEnabled || companyAccountsEnabled);

    return { 
        isHost: Boolean(isHost), 
        loggedIn: Boolean(loggedIn), 
        isAdmin: Boolean(isAdmin),
        seasonActive: Boolean(seasonActive),
        hasActiveEvent: Boolean(activeEvent),
        eventName: activeEvent?.name || null,
        eventDate: activeEvent?.date || null,
        studentAccountsEnabled: Boolean(studentAccountsEnabled),
        companyAccountsEnabled: Boolean(companyAccountsEnabled),
        showSignupLogin: Boolean(showSignupLogin)
    };
};