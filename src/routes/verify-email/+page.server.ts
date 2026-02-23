import type { Actions, PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { generateEmailVerificationCode, generatePermissionSlipCode, setNewLuciaSession, updateLastLoginToNow } from '$lib/server/auth';
import { sendEmailVerificationEmail, sendPermissionSlipEmail, formatEmailDate, type EventEmailData } from '$lib/server/email';

export const load: PageServerLoad = async (event) => {
    if (event.locals.user) {
        // Check if user is admin - admins don't need email verification
        const userInfo = await prisma.user.findFirst({
            where: { id: event.locals.user.id },
            include: { adminOfSchools: true }
        });
        
        if (userInfo?.adminOfSchools && userInfo.adminOfSchools.length > 0) {
            // Admins can access admin dashboard without email verification
            redirect(302, "/dashboard/admin");
        }
        
        // For non-admin users, if email is verified, redirect to dashboard
        if (event.locals.user.emailVerified) {
            redirect(302, "/dashboard");
        }

        // Automatically trigger a verification email if one hasn't been sent recently
        // This handles cases like manual DB resets or failed emails during signup
        const userId = event.locals.user.id;
        const email = event.locals.user.email;
        
        const existingCode = await prisma.emailVerificationCodes.findFirst({
            where: { user_id: userId }
        });

        // If no code exists, or if it's about to expire (within 5 mins of the 15 min lifetime), 
        // send a new one automatically on first landing
        const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
        if (!existingCode || existingCode.expires_at < fiveMinutesFromNow) {
            // Try to find school name for user
            const userInfo = await prisma.user.findFirst({
                where: { id: userId },
                include: { 
                    student: { include: { school: true } },
                    host: { include: { company: { include: { school: true } } } }
                }
            });

            const schoolName = userInfo?.student?.school?.name || userInfo?.host?.company?.school?.name;
            const code = await generateEmailVerificationCode(userId, email);
            await sendEmailVerificationEmail(userId, email, code, schoolName);
        }
    }

    const props = event.url.searchParams;

    const code = props.get("code")?.toString();
    const userId = props.get("uid")?.toString();

    if (code && userId) {
        const correctCode = await prisma.emailVerificationCodes.findFirst({
            where: { user_id: userId }
        });

        if (!correctCode || correctCode.code != code) {
            return { msg: "Incorrect Link. Please Resend and Try again.", email: event.locals.user?.email };
        }

        if (correctCode.expires_at < new Date()) {
            return { msg: "Expired Link. Please Resend and Try again.", email: event.locals.user?.email };
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                emailVerified: true,
            }
        });
        
        await prisma.emailVerificationCodes.delete({
            where: { user_id: userId }
        });

        // Trigger automatic permission slip email for brand new students
        const student = await prisma.student.findFirst({
            where: { userId: userId },
            include: { school: true }
        });

        if (student && student.schoolId) {
            const activeEvent = await prisma.event.findFirst({
                where: {
                    isActive: true,
                    schoolId: student.schoolId
                }
            });

            if (activeEvent) {
                // Only send if they haven't already submitted one
                const existingSubmission = await prisma.permissionSlipSubmission.findFirst({
                    where: {
                        studentId: student.id,
                        eventId: activeEvent.id
                    }
                });

                if (!existingSubmission && student.parentEmail) {
                    const eventData: EventEmailData = {
                        eventName: activeEvent.name || 'JobCamp',
                        eventDate: formatEmailDate(activeEvent.date),
                        schoolName: student.school?.name || 'School',
                        schoolId: student.schoolId
                    };

                    try {
                        const slipCode = await generatePermissionSlipCode(userId);
                        await sendPermissionSlipEmail(student.parentEmail, slipCode, student.firstName, eventData);
                    } catch (error) {
                        console.error('Error sending automatic permission slip email on verification:', error);
                    }
                }
            }
        }

        if (!event.locals.user) {
            await updateLastLoginToNow(userId);
            await setNewLuciaSession(userId, event);
        }

        // Check if user is admin and redirect accordingly
        const userInfo = await prisma.user.findFirst({
            where: { id: userId },
            include: { adminOfSchools: true }
        });
        
        if (userInfo?.adminOfSchools && userInfo.adminOfSchools.length > 0) {
            redirect(302, "/dashboard/admin");
        }
        redirect(302, "/dashboard")
    }

    return { msg: "", email: event.locals.user?.email };
};


export const actions: Actions = {
    resend: async (event) => {
        if (!event.locals.user) {
            return { msg: "You must be logged in to resend the verification email." };
        }

        const email = event.locals.user.email;
        const userId = event.locals.user.id;

        // Try to find school name for user
        const userInfo = await prisma.user.findFirst({
            where: { id: userId },
            include: { 
                student: { include: { school: true } },
                host: { include: { company: { include: { school: true } } } }
            }
        });

        const schoolName = userInfo?.student?.school?.name || userInfo?.host?.company?.school?.name;

        const code = await generateEmailVerificationCode(userId, email)
        await sendEmailVerificationEmail(userId, email, code, schoolName);

        return { success: "Verification email resent!" };
    }
};