import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { scrypt } from '$lib/server/hash';
import { lucia } from '$lib/server/auth';

export const load: PageServerLoad = async () => {
    // Check if there's an active event and its controls
    const activeEvent = await prisma.event.findFirst({
        where: {
            isActive: true
        }
    });

    const hasActiveEvent = !!activeEvent;
    const eventName = activeEvent?.name || null;
    const studentAccountsEnabled = Boolean(activeEvent?.studentAccountsEnabled);
    const companyAccountsEnabled = Boolean(activeEvent?.companyAccountsEnabled);

    return {
        hasActiveEvent,
        eventName,
        studentAccountsEnabled,
        companyAccountsEnabled
    };
};

export const actions: Actions = {
    default: async ({ request, cookies, locals }) => {
        // If already logged in, redirect to dashboard
        if (locals.user) {
            redirect(302, '/dashboard');
        }

        const formData = await request.formData();
        const email = formData.get('email')?.toString();
        const password = formData.get('password')?.toString();

        if (!email || !password) {
            return {
                success: false,
                message: 'Email and password are required'
            };
        }

        try {
            // Find user by email
            const user = await prisma.user.findUnique({
                where: { email },
                include: { adminOfSchools: true }
            });

            if (!user) {
                return {
                    success: false,
                    message: 'Invalid email or password'
                };
            }

            // Check if user is an admin
            if (!user.adminOfSchools || user.adminOfSchools.length === 0) {
                return {
                    success: false,
                    message: 'Access denied. Administrator privileges required.'
                };
            }

            // Verify password using the same method as the auth system
            const validPassword = await scrypt.verify(password, user.passwordSalt, user.passwordHash);
            
            if (!validPassword) {
                return {
                    success: false,
                    message: 'Invalid email or password'
                };
            }

            // Create session
            const session = await lucia.createSession(user.id, {});
            const sessionCookie = lucia.createSessionCookie(session.id);
            
            cookies.set(sessionCookie.name, sessionCookie.value, {
                path: '.',
                ...sessionCookie.attributes
            });

            // Redirect to admin dashboard after successful login
            redirect(302, '/dashboard/admin');
        } catch (error) {
            // Check if this is a redirect (which is expected behavior)
            if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
                // This is a redirect, not an error - re-throw it
                throw error;
            }
            
            console.error('Admin login error:', error);
            return {
                success: false,
                message: 'An error occurred during login. Please try again.'
            };
        }
    }
};
