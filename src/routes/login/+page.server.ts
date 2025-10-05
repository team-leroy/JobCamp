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

    const studentAccountsEnabled = Boolean(activeEvent?.studentAccountsEnabled);
    const companyAccountsEnabled = Boolean(activeEvent?.companyAccountsEnabled);
    const seasonActive = Boolean(activeEvent?.isActive);

    const form = await superValidate(zod(schema));
    return { 
        form,
        seasonActive: Boolean(seasonActive),
        hasActiveEvent: Boolean(activeEvent),
        studentAccountsEnabled: Boolean(studentAccountsEnabled),
        companyAccountsEnabled: Boolean(companyAccountsEnabled),
        eventName: activeEvent?.name || null
    };
};

export const actions: Actions = {
    default: async (event) => {
        const { request } = event;
        const form = await superValidate(request, zod(schema));
  
        if (!form.valid) {
            return fail(400, { form });
        }

        // Check if season is active before attempting login
        const activeEvent = await prisma.event.findFirst({
            where: {
                isActive: true
            }
        });

        const studentAccountsEnabled = activeEvent?.studentAccountsEnabled ?? false;
        const companyAccountsEnabled = activeEvent?.companyAccountsEnabled ?? false;
        const seasonActive = Boolean(activeEvent?.isActive);

        // First validate credentials without logging in
        const existingUser = await prisma.user.findFirst({ 
            where: { email: form.data.email },
            include: { 
                adminOfSchools: true,
                host: true,
                student: true
            }
        });
        
        if (!existingUser) {
            return message(form, "Incorrect Email or Password.");
        }

        // Check password without logging in
        const { scrypt } = await import('$lib/server/hash.js');
        const validPassword = await scrypt.verify(form.data.password, existingUser.passwordSalt, existingUser.passwordHash);
        if (!validPassword) {
            return message(form, "Incorrect Email or Password.");
        }

        // Check if user is admin - admins can always login
        const isAdmin = existingUser.adminOfSchools && existingUser.adminOfSchools.length > 0;
        
        // Block student/company login if season is not active
        if (!isAdmin && !seasonActive) {
            if (!activeEvent) {
                return message(form, "JobCamp has ended. Please check back next year!");
            } else if (!activeEvent.isActive) {
                return message(form, "JobCamp is currently in preparation mode. Please check back later!");
            }
        }

        // Check specific account type restrictions for active events BEFORE logging in
        if (!isAdmin && seasonActive) {
            const isStudent = existingUser.student !== null;
            const isCompany = existingUser.host !== null;
            
                    if (isStudent && !studentAccountsEnabled) {
                        return message(form, `Student accounts are currently disabled for ${activeEvent?.name || "this event"}. Please check back later.`);
                    }
                    
                    if (isCompany && !companyAccountsEnabled) {
                        return message(form, `Company accounts are currently disabled for ${activeEvent?.name || "this event"}. Please check back later.`);
                    }
        }

        // If we get here, the user is allowed to login - now actually log them in
        const res = await login(form.data.email, form.data.password, event);
        if (res == AuthError.IncorrectCredentials) {
            return message(form, "Incorrect Email or Password.");
        }

        if (!existingUser.emailVerified) {
            redirect(302, "/verify-email");
        }

        redirect(302, "/dashboard");
    }
}