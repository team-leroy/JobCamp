import { prisma } from './prisma';

export async function getNavbarData() {
    // Check if there's an active event and its controls
    const activeEvent = await prisma.event.findFirst({
        where: {
            isActive: true
        }
    });

    const studentAccountsEnabled = Boolean(activeEvent?.studentAccountsEnabled);
    const companyAccountsEnabled = Boolean(activeEvent?.companyAccountsEnabled);
    const companySignupsEnabled = Boolean(activeEvent?.companySignupsEnabled);
    const seasonActive = Boolean(activeEvent?.isActive);

    // Determine if signup/login should be shown
    const showSignupLogin = seasonActive && (studentAccountsEnabled || companyAccountsEnabled);

    return {
        hasActiveEvent: Boolean(activeEvent),
        eventName: activeEvent?.name || null,
        studentAccountsEnabled: Boolean(studentAccountsEnabled),
        companyAccountsEnabled: Boolean(companyAccountsEnabled),
        companySignupsEnabled: Boolean(companySignupsEnabled),
        showSignupLogin: Boolean(showSignupLogin)
    };
}
