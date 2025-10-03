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
        console.log('🔐 Admin login action started');
        
        // If already logged in, redirect to dashboard
        if (locals.user) {
            console.log('👤 User already logged in, redirecting to dashboard:', locals.user.id);
            redirect(302, '/dashboard');
        }

        const formData = await request.formData();
        const email = formData.get('email')?.toString();
        const password = formData.get('password')?.toString();

        console.log('📧 Admin login attempt:', { email, hasPassword: !!password });

        if (!email || !password) {
            console.log('❌ Missing email or password');
            return {
                success: false,
                message: 'Email and password are required'
            };
        }

        try {
            // Find user by email
            console.log('🔍 Looking up user by email:', email);
            const user = await prisma.user.findUnique({
                where: { email },
                include: { adminOfSchools: true }
            });

            console.log('👤 User lookup result:', { 
                found: !!user, 
                userId: user?.id, 
                email: user?.email,
                adminOfSchoolsCount: user?.adminOfSchools?.length || 0
            });

            if (!user) {
                console.log('❌ User not found');
                return {
                    success: false,
                    message: 'Invalid email or password'
                };
            }

            // Check if user is an admin
            if (!user.adminOfSchools || user.adminOfSchools.length === 0) {
                console.log('❌ User is not an admin');
                return {
                    success: false,
                    message: 'Access denied. Administrator privileges required.'
                };
            }

            // Verify password using the same method as the auth system
            console.log('🔑 Verifying password for user:', user.id);
            const validPassword = await scrypt.verify(password, user.passwordSalt, user.passwordHash);
            console.log('🔑 Password verification result:', validPassword);
            
            if (!validPassword) {
                console.log('❌ Invalid password');
                return {
                    success: false,
                    message: 'Invalid email or password'
                };
            }

            // Create session
            console.log('🎫 Creating session for user:', user.id);
            const session = await lucia.createSession(user.id, {});
            const sessionCookie = lucia.createSessionCookie(session.id);
            
            console.log('🍪 Setting session cookie:', { 
                name: sessionCookie.name, 
                hasValue: !!sessionCookie.value,
                attributes: sessionCookie.attributes 
            });
            
            cookies.set(sessionCookie.name, sessionCookie.value, {
                path: '.',
                ...sessionCookie.attributes
            });

            console.log('✅ Admin login successful, redirecting to /dashboard/admin');
            // Redirect to admin dashboard after successful login
            redirect(302, '/dashboard/admin');
        } catch (error) {
            // Check if this is a redirect (which is expected behavior)
            if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
                console.log('🔄 Redirect detected (expected):', { 
                    status: error.status, 
                    location: error.location 
                });
                // This is a redirect, not an error - re-throw it
                throw error;
            }
            
            console.error('❌ Admin login error:', error);
            return {
                success: false,
                message: 'An error occurred during login. Please try again.'
            };
        }
    }
};
