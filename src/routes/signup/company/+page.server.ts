import { PageType, userAccountSetupFlow } from '$lib/server/authFlow';
import type { PageServerLoad, Actions } from "./$types";
import { createCompanySchema } from "./schema";
import { message, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { generateEmailVerificationCode, signup } from '$lib/server/auth';
import { prisma } from '$lib/server/prisma';
import { AuthError } from '$lib/server/authConstants';
import { sendEmailVerificationEmail } from '$lib/server/email';
import { fail, redirect } from '@sveltejs/kit';
import { getNavbarData } from '$lib/server/navbarData';

export const load: PageServerLoad = async (event) => {
    await userAccountSetupFlow(event.locals, PageType.AccountCreation);

    // Check if season is active for signups
    const activeEvent = await prisma.event.findFirst({
        where: {
            isActive: true
        }
    });

    const seasonActive = Boolean(activeEvent?.isActive);

    // Redirect to homepage if season is not active
    if (!seasonActive) {
        redirect(302, "/");
    }

    const form = await superValidate(zod(createCompanySchema()));
    
    // Get navbar data
    const navbarData = await getNavbarData();
    
    return { form, isAdmin: false, ...navbarData };
};

export const actions: Actions = {
    default: async (event) => {
        const { request } = event;
        const form = await superValidate(request, zod(createCompanySchema()));

        if (!form.valid) {
            return fail(400, { form });
        }

        const schoolId = (await prisma.school.findFirst())?.id; // TODO: SCHOOL FIELD for multiple schools
        if (!schoolId) {
            return message(form, "Database Error");
        }

        const userId = await signup(form.data.email, form.data.password, event);
        if (userId == AuthError.AccountExists) {
            return message(form, "Account already exists. Login instead.");
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                host: { create: {
                    name: form.data.name,
                }}
            },
            include: {
                host: true
            }
        });

        if (!user.host) {
            redirect(302, "/");
        }
        
        await prisma.company.upsert({
            where: { companyName: form.data.companyName },
            update: {
                hosts: { connect: { id: user.host.id } }
            },
            create: {
                companyName: form.data.companyName,
                companyDescription: form.data.companyDescription,
                companyUrl: form.data.companyUrl,
                school: { connect: {
                    id: schoolId
                }},
                hosts: { connect: { id: user.host.id } }
            }
        })

        // runs in background while user is redirected
        const code = await generateEmailVerificationCode(userId, user.email)
        await sendEmailVerificationEmail(userId, user.email, code);

        redirect(302, "/verify-email");
    }
};
  