import { prisma } from '$lib/server/prisma';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    const loggedIn = locals.user != null;
    
    let isHost = false;
    let isAdmin = false;
    if (locals.user) {
        isHost = locals.user.host != null;
        isAdmin = locals.user.adminOfSchools != null && locals.user.adminOfSchools.length > 0;
    }

    const schoolWebAddr = params.school;

    const school = await prisma.school.findFirst({ where: { webAddr: schoolWebAddr } });

    if (!school) {
        redirect(302, "/");
    }

    // Check if there's an active event and if company directory is enabled
    const activeEvent = await prisma.event.findFirst({
        where: {
            schoolId: school.id,
            isActive: true
        }
    });

    const eventEnabled = activeEvent?.eventEnabled ?? false;
    const companyDirectoryEnabled = activeEvent?.companyDirectoryEnabled ?? false;
    const directoryAccessible = activeEvent && eventEnabled && companyDirectoryEnabled;

    let positionData = [];
    if (directoryAccessible) {
        positionData = await prisma.position.findMany({
            where: {
                event: {
                    schoolId: school.id,
                    isActive: true
                }
            },
            include: {
                host: {
                    select: {
                        company: true
                    }
                }
            }
        });
    }

    return { 
        positionData, 
        isHost, 
        loggedIn, 
        isAdmin,
        hasActiveEvent: !!activeEvent,
        eventEnabled,
        companyDirectoryEnabled,
        directoryAccessible,
        eventName: activeEvent?.name || null
    };
}