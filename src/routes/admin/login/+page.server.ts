import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { lucia } from '$lib/server/auth';
import { Argon2id } from 'oslo/password';

export const load: PageServerLoad = async () => {
    // Check if there's an active event and its controls
    const activeEvent = await prisma.event.findFirst({
        where: {
            isActive: true
        }
    });

    const hasActiveEvent = !!activeEvent;
    const eventName = activeEvent?.name || null;
    const studentAccountsEnabled = activeEvent?.studentAccountsEnabled ?? false;
    const companyAccountsEnabled = activeEvent?.companyAccountsEnabled ?? false;

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

            // Verify password
            const validPassword = await new Argon2id().verify(user.passwordHash, password);
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

            return {
                success: true,
                message: 'Login successful'
            };
        } catch (error) {
            console.error('Admin login error:', error);
            return {
                success: false,
                message: 'An error occurred during login. Please try again.'
            };
        }
    }
};
