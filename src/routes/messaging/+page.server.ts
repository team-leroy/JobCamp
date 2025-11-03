import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { canAccessFullAdminFeatures } from '$lib/server/roleUtils';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        redirect(302, "/login");
    }
    if (!locals.user.emailVerified) {
        redirect(302, "/verify-email");
    }

    // Check if user is admin
    const userInfo = await prisma.user.findFirst({
        where: { id: locals.user.id },
        include: { adminOfSchools: true }
    });

    if (!userInfo?.adminOfSchools?.length) {
        redirect(302, "/dashboard");
    }

    // Check if user has full admin access (read-only admins cannot access messaging)
    if (!canAccessFullAdminFeatures(userInfo)) {
        redirect(302, "/dashboard");
    }

    // Load messaging-specific data
    //const messages = await prisma.message.findMany({
    //    where: { schoolId: { in: userInfo.adminOfSchools.map(s => s.id) } },
    //    orderBy: { createdAt: 'desc' }
    //});

    return {
        isAdmin: true,
        loggedIn: true,
        isHost: !!locals.user.host,
        userRole: userInfo.role
    };
};