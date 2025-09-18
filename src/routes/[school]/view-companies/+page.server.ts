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

    const positionData = await prisma.position.findMany({
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

    return { positionData, isHost, loggedIn, isAdmin };
}