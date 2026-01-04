import { fail, redirect, type Actions, type PageServerLoad } from '@sveltejs/kit';
import { setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { prisma } from '$lib/server/prisma';
import { formatPhoneNumber } from '$lib/server/twilio';
import { createContactInfoSchema } from './schema';
import { getNavbarData } from '$lib/server/navbarData';
import { userAccountSetupFlow, PageType } from '$lib/server/authFlow';
import { generatePermissionSlipCode } from '$lib/server/auth';
import { sendPermissionSlipEmail, formatEmailDate, type EventEmailData } from '$lib/server/email';

export const load: PageServerLoad = async (event) => {
    // Use the auth flow helper to handle redirects
    await userAccountSetupFlow(event.locals, PageType.ContactInfoVerify);

    // Get student record
    const student = await prisma.student.findFirst({
        where: { userId: event.locals.user.id },
        include: { school: true }
    });

    // Redirect if not a student
    if (!student) {
        redirect(302, "/dashboard");
    }

    // Get active event
    const activeEvent = await prisma.event.findFirst({
        where: {
            isActive: true,
            schoolId: student.schoolId!
        }
    });

    if (!activeEvent) {
        redirect(302, "/dashboard");
    }

    // Get school for email domain validation
    const school = await prisma.school.findFirst({
        where: { id: student.schoolId! }
    });

    // Pre-populate form with current values
    const form = await superValidate(
        {
            parentEmail: student.parentEmail || '',
            phone: student.phone || ''
        },
        zod(createContactInfoSchema(school?.emailDomain))
    );

    // Get navbar data
    const navbarData = await getNavbarData();
    const isAdmin = event.locals.user?.adminOfSchools && event.locals.user.adminOfSchools.length > 0;

    return {
        form,
        eventName: activeEvent.name || 'this event',
        schoolEmailDomain: school?.emailDomain || '',
        isAdmin: Boolean(isAdmin),
        ...navbarData
    };
};

export const actions: Actions = {
    default: async (event) => {
        if (!event.locals.user) {
            redirect(302, "/login");
        }

        // Get student record
        const student = await prisma.student.findFirst({
            where: { userId: event.locals.user.id },
            include: { school: true }
        });

        if (!student || !student.school) {
            return fail(400, { form: await superValidate(zod(createContactInfoSchema())) });
        }

        // Get active event
        const activeEvent = await prisma.event.findFirst({
            where: {
                isActive: true,
                schoolId: student.schoolId!
            }
        });

        if (!activeEvent) {
            return fail(400, { form: await superValidate(zod(createContactInfoSchema())) });
        }

        // Get school for validation
        const school = await prisma.school.findFirst({
            where: { id: student.schoolId! }
        });

        // Validate form
        const form = await superValidate(
            event.request,
            zod(createContactInfoSchema(school?.emailDomain))
        );

        if (!form.valid) {
            return fail(400, { form });
        }

        // Additional validation: parent email cannot be the same as student email
        const studentEmail = event.locals.user.email.trim().toLowerCase();
        const parentEmailNormalized = form.data.parentEmail.trim().toLowerCase();

        if (parentEmailNormalized === studentEmail) {
            return setError(form, "parentEmail", "Please enter a different email.");
        }

        // Additional validation: parent email cannot use school email domain
        if (school?.emailDomain) {
            const schoolDomainNormalized = school.emailDomain.trim().toLowerCase();
            const schoolDomainWithAt = schoolDomainNormalized.startsWith('@')
                ? schoolDomainNormalized
                : `@${schoolDomainNormalized}`;

            if (parentEmailNormalized.endsWith(schoolDomainWithAt)) {
                return setError(
                    form,
                    "parentEmail",
                    `Parent email cannot use school email domain (${schoolDomainWithAt}). Please provide a different email.`
                );
            }
        }

        // Format phone number
        const normalizedPhone = formatPhoneNumber(form.data.phone);

        // Update student contact info
        await prisma.student.update({
            where: { id: student.id },
            data: {
                parentEmail: form.data.parentEmail.trim(),
                phone: normalizedPhone
            }
        });

        // Ensure participation record exists and mark contact info as verified
        const participation = await prisma.studentEventParticipation.findUnique({
            where: {
                studentId_eventId: {
                    studentId: student.id,
                    eventId: activeEvent.id
                }
            }
        });

        if (participation) {
            // Update existing participation record
            await prisma.studentEventParticipation.update({
                where: {
                    studentId_eventId: {
                        studentId: student.id,
                        eventId: activeEvent.id
                    }
                },
                data: {
                    contactInfoVerifiedAt: new Date()
                }
            });
        } else {
            // Create new participation record with verified contact info
            await prisma.studentEventParticipation.create({
                data: {
                    studentId: student.id,
                    eventId: activeEvent.id,
                    contactInfoVerifiedAt: new Date()
                }
            });
        }

        // Trigger automatic permission slip email to parent
        if (student.school) {
            const eventData: EventEmailData = {
                eventName: activeEvent.name || 'JobCamp',
                eventDate: formatEmailDate(activeEvent.date),
                schoolName: student.school.name,
                schoolId: student.school.id
            };

            try {
                const code = await generatePermissionSlipCode(event.locals.user.id);
                await sendPermissionSlipEmail(form.data.parentEmail.trim(), code, student.firstName, eventData);
            } catch (error) {
                console.error('Error sending automatic permission slip email:', error);
                // Don't fail the verification if only the email fails, student can still trigger it manually from dashboard
            }
        }

        redirect(302, "/dashboard");
    }
};

