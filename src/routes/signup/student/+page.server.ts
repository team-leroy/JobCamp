import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from "./$types";
import { createStudentSchema } from "./schema";
import { message, setError, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { generateEmailVerificationCode, generatePermissionSlipCode, schoolEmailCheck, signup } from '$lib/server/auth';
import { prisma } from '$lib/server/prisma';
import { AuthError } from '$lib/server/authConstants';
import { sendEmailVerificationEmail, sendPermissionSlipEmail, formatEmailDate, type EventEmailData } from '$lib/server/email';
import { getNavbarData } from '$lib/server/navbarData';
import { getGraduatingClassYear } from '$lib/server/gradeUtils';
import { formatPhoneNumber } from '$lib/server/twilio';


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
    const primarySchoolDomain = schools[0]?.emailDomain ?? undefined;

    const form = await superValidate(zod(createStudentSchema(primarySchoolDomain)));

    // Get navbar data
    const navbarData = await getNavbarData();

    const gradeOptions = ['9', '10', '11', '12'];

    return { 
        form, 
        schoolMapping, 
        gradeOptions,
        ...navbarData 
    };
};

export const actions: Actions = {
    default: async (event) => {
        const { request } = event;
        const school = await prisma.school.findFirst(); // TODO: SCHOOL FIELD for multiple schools
        const form = await superValidate(request, zod(createStudentSchema(school?.emailDomain)));

        if (!form.valid) {
            return fail(400, { form });
        }

        if (!school) {
            return message(form, "Database Error");
        }

        if (!schoolEmailCheck(school.emailDomain).test(form.data.email)) {
            return setError(form, "email", "Please enter a valid school email.")
        }

        const studentEmailNormalized = form.data.email.trim().toLowerCase();
        const parentEmailNormalized = form.data.parentEmail.trim().toLowerCase();
        const schoolDomainNormalized = school.emailDomain.trim().toLowerCase();
        const schoolDomainWithAt = schoolDomainNormalized.startsWith('@')
            ? schoolDomainNormalized
            : `@${schoolDomainNormalized}`;

        if (parentEmailNormalized === studentEmailNormalized) {
            return setError(form, "parentEmail", "Please enter a different email.");
        }

        if (parentEmailNormalized.endsWith(schoolDomainWithAt)) {
            return setError(
                form,
                "parentEmail",
                `Parent email cannot use school email domain (${schoolDomainWithAt}). Please provide a different email.`
            );
        }

        const activeEvent = await prisma.event.findFirst({
            where: { isActive: true }
        });

        const gradeNumber = Number(form.data.grade);
        const graduatingClassYear = getGraduatingClassYear(
            gradeNumber,
            activeEvent?.date ?? new Date()
        );
        const normalizedPhone = formatPhoneNumber(form.data.phone);

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
                            graduatingClassYear,
                            phone: normalizedPhone,
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

        if (activeEvent) {
            const eventData: EventEmailData = {
                eventName: activeEvent.name || 'JobCamp',
                eventDate: formatEmailDate(activeEvent.date),
                schoolName: school.name,
                schoolId: school.id
            };

            generatePermissionSlipCode(userId).then(
                (code) => sendPermissionSlipEmail(form.data.parentEmail, code, form.data.firstName, eventData)
            );
        }

        redirect(302, "/verify-email");
    }
};
  