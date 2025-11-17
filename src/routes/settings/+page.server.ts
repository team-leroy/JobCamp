import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { hashPassword, verifyPassword } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        redirect(302, "/login");
    }
    if (!locals.user.emailVerified) {
        redirect(302, "/verify-email");
    }

    // Get user info including role
    const userInfo = await prisma.user.findFirst({
        where: { id: locals.user.id },
        include: { 
            adminOfSchools: true,
            student: true,
            host: true
        }
    });

    if (!userInfo) {
        redirect(302, "/login");
    }

    const isAdmin = userInfo.adminOfSchools.length > 0;
    const isStudent = !!userInfo.student;
    const isHost = !!userInfo.host;

    return {
        user: {
            email: userInfo.email,
            role: userInfo.role,
            createdAt: userInfo.createdAt,
            lastLogin: userInfo.lastLogin
        },
        isAdmin,
        isStudent,
        isHost,
        loggedIn: true,
        userRole: userInfo.role
    };
};

export const actions: Actions = {
    changePassword: async ({ request, locals }) => {
        if (!locals.user) {
            return { success: false, message: 'Not authenticated' };
        }

        try {
            const formData = await request.formData();
            const currentPassword = formData.get('currentPassword')?.toString();
            const newPassword = formData.get('newPassword')?.toString();
            const confirmPassword = formData.get('confirmPassword')?.toString();

            if (!currentPassword || !newPassword || !confirmPassword) {
                return { success: false, message: 'All fields are required' };
            }

            if (newPassword !== confirmPassword) {
                return { success: false, message: 'New passwords do not match' };
            }

            if (newPassword.length < 8) {
                return { success: false, message: 'Password must be at least 8 characters' };
            }

            // Get current user with password
            const user = await prisma.user.findUnique({
                where: { id: locals.user.id },
                select: {
                    id: true,
                    passwordHash: true,
                    passwordSalt: true
                }
            });

            if (!user) {
                return { success: false, message: 'User not found' };
            }

            // Verify current password
            const isValid = await verifyPassword(currentPassword, user.passwordSalt, user.passwordHash);
            if (!isValid) {
                return { success: false, message: 'Current password is incorrect' };
            }

            // Hash new password
            const { hash, salt } = await hashPassword(newPassword);

            // Update password
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    passwordHash: hash,
                    passwordSalt: salt
                }
            });

            return { success: true, message: 'Password changed successfully' };
        } catch (error) {
            console.error('Error changing password:', error);
            return { success: false, message: 'Failed to change password' };
        }
    }
};

