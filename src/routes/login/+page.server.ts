import { fail, message, superValidate } from 'sveltekit-superforms';
import type { Actions, PageServerLoad } from './$types';
import { schema } from './schema';
import { zod } from 'sveltekit-superforms/adapters';
import { prisma } from '$lib/server/prisma';
import { login } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import { AuthError } from '$lib/server/authConstants';

export const load: PageServerLoad = async (event) => {
    if (event.locals.user) {
        redirect(302, "/dashboard");
    }

    // Check if there's an active and enabled event for the season
    const activeEvent = await prisma.event.findFirst({
        where: {
            isActive: true
        }
    });

    const eventEnabled = activeEvent?.eventEnabled ?? false;
    const seasonActive = activeEvent && eventEnabled;

    const form = await superValidate(zod(schema));
    return { 
        form,
        seasonActive,
        eventEnabled,
        hasActiveEvent: !!activeEvent
    };
};

export const actions: Actions = {
    default: async (event) => {
        try {
            console.log('🔍 Login action started');
            const { request } = event;
            const form = await superValidate(request, zod(schema));
      
            if (!form.valid) {
                console.log('❌ Form validation failed:', form.errors);
                return fail(400, { form });
            }

            console.log('✅ Form validation passed for email:', form.data.email);

            // Check if season is active before attempting login
            const activeEvent = await prisma.event.findFirst({
                where: {
                    isActive: true
                }
            });

            const eventEnabled = activeEvent?.eventEnabled ?? false;
            const seasonActive = activeEvent && eventEnabled;
            console.log('🎯 Season check - Active event:', !!activeEvent, 'Event enabled:', eventEnabled);

            const res = await login(form.data.email, form.data.password, event);
            console.log('🔐 Login attempt result:', res);
            
            if (res == AuthError.IncorrectCredentials) {
                console.log('❌ Incorrect credentials');
                return message(form, "Incorrect Email or Password.");
            }
            
            console.log('✅ Login successful, fetching user data...');
            const user = await prisma.user.findFirst({
                where: { id: res },
                include: { 
                    adminOfSchools: true,
                    host: true,
                    student: true
                }
            });
            
            if (!user) {
                console.log('❌ User not found after login');
                return message(form, "Error creating account. Please try again or contact support at admin@jobcamp.org.");
            }

            console.log('👤 User loaded:', {
                email: user.email,
                isAdmin: user.adminOfSchools.length > 0,
                isStudent: !!user.student,
                isHost: !!user.host,
                emailVerified: user.emailVerified
            });

            // Check if user is admin - admins can always login
            const isAdmin = user.adminOfSchools && user.adminOfSchools.length > 0;
            
            // Block student/company login if season is not active
            if (!isAdmin && !seasonActive) {
                console.log('🚫 Non-admin user blocked - season not active');
                if (!activeEvent) {
                    return message(form, "JobCamp season has ended. Please check back next year!");
                } else if (!eventEnabled) {
                    return message(form, "JobCamp is currently in preparation mode. Please check back later!");
                }
            }

            if (!user.emailVerified) {
                console.log('📧 Redirecting to email verification');
                redirect(302, "/verify-email");
            }

            console.log('🎉 Login complete, redirecting to dashboard');
            redirect(302, "/dashboard");
        } catch (error) {
            console.error('💥 Login action error:', error);
            console.error('Error stack:', error.stack);
            throw error; // Re-throw to see full error in browser
        }
    }
}