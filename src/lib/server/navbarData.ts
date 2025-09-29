import { prisma } from './prisma';

export async function getNavbarData() {
    // Check if there's an active event and its controls
    const activeEvent = await prisma.event.findFirst({
        where: {
            isActive: true
        }
    });

    const eventEnabled = Boolean(activeEvent?.eventEnabled);
    const studentAccountsEnabled = Boolean(activeEvent?.studentAccountsEnabled);
    const companyAccountsEnabled = Boolean(activeEvent?.companyAccountsEnabled);
    const seasonActive = activeEvent && eventEnabled;

    // Determine if signup/login should be shown
    const showSignupLogin = seasonActive && (studentAccountsEnabled || companyAccountsEnabled);

    return {
        hasActiveEvent: Boolean(activeEvent),
        eventName: activeEvent?.name || null,
        eventEnabled: Boolean(eventEnabled),
        studentAccountsEnabled: Boolean(studentAccountsEnabled),
        companyAccountsEnabled: Boolean(companyAccountsEnabled),
        showSignupLogin: Boolean(showSignupLogin)
    };
}
