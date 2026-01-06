import { PageType, userAccountSetupFlow } from '$lib/server/authFlow';
import { type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from "./$types";
import { generatePermissionSlipCode } from '$lib/server/auth';
import { sendPermissionSlipEmail, formatEmailDate } from '$lib/server/email';
import { prisma } from '$lib/server/prisma';

export const load: PageServerLoad = async (event) => {
    await userAccountSetupFlow(event.locals, PageType.PermissionSlip);
};

export const actions: Actions = {
    default: async (event) => {
        if (!event.locals.user) {
            return;
        }

        // Fetch student and school info
        const userWithStudent = await prisma.user.findUnique({
            where: { id: event.locals.user.id },
            include: {
                student: {
                    include: {
                        school: true
                    }
                }
            }
        });

        if (!userWithStudent?.student || !userWithStudent.student.school) {
            return;
        }

        const student = userWithStudent.student;
        const school = student.school;
        const userId = userWithStudent.id;
        const parentEmail = student.parentEmail;
        const studentName = `${student.firstName} ${student.lastName}`;

        // Get active event for email templating
        const activeEvent = await prisma.event.findFirst({
            where: {
                schoolId: school.id,
                isActive: true
            }
        });

        if (!activeEvent) {
            return;
        }

        const eventData = {
            eventName: activeEvent.name || 'JobCamp',
            eventDate: formatEmailDate(activeEvent.date),
            schoolName: school.name,
            schoolId: school.id
        };

        await generatePermissionSlipCode(userId).then(
            (code) => sendPermissionSlipEmail(parentEmail, code, studentName, eventData)
        );
    }
}