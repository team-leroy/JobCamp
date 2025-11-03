import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from "./$types";
import { createStudentSchema } from "./schema";
import { message, setError, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { generateEmailVerificationCode, generatePermissionSlipCode, schoolEmailCheck, signup } from '$lib/server/auth';
import { prisma } from '$lib/server/prisma';
import { AuthError } from '$lib/server/authConstants';
import { sendEmailVerificationEmail, sendPermissionSlipEmail } from '$lib/server/email';
import { getNavbarData } from '$lib/server/navbarData';
import { getGraduatingClassYearOptions } from '$lib/server/gradeUtils';


export const load: PageServerLoad = async (event) => {
    if (event.locals.user) {
        redirect(302, "/dashboard");
    }

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

    const schools = await prisma.school.findMany();
    const schoolMapping = Object.fromEntries(schools.map((val) => [val.id, val.name]));

    const form = await superValidate(zod(createStudentSchema()));

    // Get navbar data
    const navbarData = await getNavbarData();

    // Calculate graduating class year options based on active event date
    const graduatingClassYearOptions = activeEvent?.date
        ? getGraduatingClassYearOptions(activeEvent.date)
        : [];

    return { 
        form, 
        schoolMapping, 
        graduatingClassYearOptions,
        ...navbarData 
    };
};

export const actions: Actions = {
    default: async (event) => {
        const { request } = event;
        const form = await superValidate(request, zod(createStudentSchema()));

        if (!form.valid) {
            return fail(400, { form });
        }

        const school = (await prisma.school.findFirst()); // TODO: SCHOOL FIELD for multiple schools
        if (!school) {
            return message(form, "Database Error");
        }

        if (!schoolEmailCheck(school.emailDomain).test(form.data.email)) {
            return setError(form, "email", "Please enter your school email.")
        }

        if (form.data.parentEmail == form.data.email) {
            return setError(form, "parentEmail", "Please enter a different email.")
        }

        const userId = await signup(form.data.email, form.data.password, event);
        if (userId == AuthError.AccountExists) {
            return message(form, "Account Already Exists. Login instead.");
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                student: {
                    connectOrCreate: {
                        where: {
                            userId: userId,
                        },
                        create: {
                            firstName: form.data.firstName, // TODO: lastName
                            lastName: form.data.lastName,
                            graduatingClassYear: form.data.graduatingClassYear,
                            phone: form.data.phone,
                            parentEmail: form.data.parentEmail,
                            school: {
                                connect: {
                                    id: school.id
                                }
                            }
                        }
                    }
                }
            }
        });

        // runs in background while user is redirected
        const code = await generateEmailVerificationCode(userId, user.email)
        await sendEmailVerificationEmail(userId, user.email, code);

        generatePermissionSlipCode(userId).then(
            (code) => sendPermissionSlipEmail(form.data.parentEmail, code, form.data.firstName)
        );

        redirect(302, "/verify-email");
    }
};
  