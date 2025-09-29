import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { login } from '$lib/server/auth';
import { AuthError } from '$lib/server/authConstants';

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
            // Create a mock RequestEvent for the login function
            const mockEvent = {
                cookies: {
                    set: (name: string, value: string, options: Record<string, unknown>) => {
                        cookies.set(name, value, options);
                    }
                }
            };
            
            // Use the existing login function to verify credentials
            const loginResult = await login(email, password, mockEvent as Parameters<typeof login>[2]);
            
            if (loginResult === AuthError.IncorrectCredentials) {
                return {
                    success: false,
                    message: 'Invalid email or password'
                };
            }

            // Get the user to check admin privileges
            const user = await prisma.user.findUnique({
                where: { id: loginResult },
                include: { adminOfSchools: true }
            });

            if (!user || !user.adminOfSchools || user.adminOfSchools.length === 0) {
                return {
                    success: false,
                    message: 'Access denied. Administrator privileges required.'
                };
            }

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
