import type { PageServerLoad } from './$types';
import { getNavbarData } from '$lib/server/navbarData';

export const load : PageServerLoad = async ({ locals }) => {
    const loggedIn = locals.user != null;
    
    let isHost = false;
    let isAdmin = false;
    if (locals.user) {
        isHost = locals.user.host != null;
        isAdmin = locals.user.adminOfSchools?.length > 0 || false;
    }

    // Get navbar data
    const navbarData = await getNavbarData();

    return { isHost, loggedIn, isAdmin, ...navbarData };
};