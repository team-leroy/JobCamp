import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from "./$types";
import { prisma } from '$lib/server/prisma';

export const load: PageServerLoad = async (event) => {
    if (event.locals.user) {
        redirect(302, "/dashboard");
    }
    
    // Check if season is active for signups
    const activeEvent = await prisma.event.findFirst({
        where: {
            isActive: true
        }
    });

    const eventEnabled = activeEvent?.eventEnabled ?? false;
    const seasonActive = activeEvent && eventEnabled;

    // Redirect to homepage if season is not active
    if (!seasonActive) {
        redirect(302, "/");
    }
    
    return { isAdmin: false };
};