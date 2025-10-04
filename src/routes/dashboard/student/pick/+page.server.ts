import { prisma } from '$lib/server/prisma';
import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { generatePermissionSlipCode } from '$lib/server/auth';
import { sendPermissionSlipEmail } from '$lib/server/email';
import { getPermissionSlipStatus } from '$lib/server/permissionSlips';
import { trackStudentParticipation, getActiveEventIdForSchool } from '$lib/server/studentParticipation';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        redirect(302, "/login");
    }

    const schoolWebAddr = "lghs";

    const school = await prisma.school.findFirst({ where: { webAddr: schoolWebAddr } });

    if (!school) {
        redirect(302, "/");
    }

    // Check if event is enabled and student signups are allowed
    const activeEvent = await prisma.event.findFirst({
        where: {
            schoolId: school.id,
            isActive: true
        }
    });

    const studentAccountsEnabled = activeEvent?.studentAccountsEnabled ?? false;
    const studentSignupsEnabled = activeEvent?.studentSignupsEnabled ?? false;

    // Student signups require: Event active + Student accounts enabled + Student signups enabled
    const canSignUp = Boolean(activeEvent?.isActive) && studentAccountsEnabled && studentSignupsEnabled;

    const positionData = await prisma.position.findMany({
        where: {
            event: {
                schoolId: school.id,
                isActive: true
            }
        },
        include: {
            host: {
                select: {
                    company: true
                }
            }
        }
    });

    const student = await prisma.student.findFirst({where: {userId: locals.user.id}});
    const studentId = student?.id;
    if (!studentId) {
        redirect(302, "/login");
    }

    // Get permission slip status for the active event
    const permissionSlipStatus = await getPermissionSlipStatus(studentId, school.id);

    const positionsOnStudents = await prisma.positionsOnStudents.findMany({ where: {
        studentId: studentId
    }})

    positionData.map((val: {
        id: string;
        selected?: boolean;
        [key: string]: unknown;
    }) => {
        val.selected = false;
        positionsOnStudents.forEach(a => {
            if (a.positionId == val.id) {
                val.selected = true;
            }
        })
        return val;
    })

    const posData: Array<{
        id: string;
        title: string;
        career: string;
        slots: number;
        summary: string;
        address: string;
        instructions: string;
        attire: string;
        arrival: string;
        start: string;
        end: string;
        host: {
            company: {
                companyName: string;
                companyDescription?: string;
                companyUrl?: string | null;
            } | null;
        };
        selected?: boolean;
        [key: string]: unknown;
    }> = positionData;

    return { 
        positionData: posData, 
        countSelected: positionsOnStudents.length, 
        permissionSlipCompleted: permissionSlipStatus.hasPermissionSlip,
        parentEmail: student.parentEmail,
        studentAccountsEnabled,
        studentSignupsEnabled,
        canSignUp,
        activeEventName: permissionSlipStatus.eventName,
        hasActiveEvent: permissionSlipStatus.hasActiveEvent
    };
}


export const actions: Actions = {
    sendPermissionSlip: async({ request, locals }) => {
        const data = await request.formData();
        console.log(data);
        
        const parentEmail = await data.get("parent-email");
        if (!parentEmail) {
            return { sent: false, err: true };
        }

        const id = locals.user?.id;
        if (!id) {
            redirect(302, "/login");
        }

        const user = await prisma.user.findFirst({ where: { id }, include: { student: true }})
        const firstName = user?.student?.firstName;
        if (!firstName) {
            redirect(302, "/login");
        }
        
        generatePermissionSlipCode(id).then(
            (code) => sendPermissionSlipEmail(parentEmail.toString(), code, firstName)
        );

        return { sent: true, err: false };
    },
    togglePosition: async ({ request, locals }) => {
        const data = await request.formData();

        const posId = data.get("id")?.toString();
        if (!posId) {
            redirect(302, "/about");
        }

        const id = locals.user?.id;
        if (!id) {
            redirect(302, "/login");
        }

        // Check if event and student signups are enabled (hierarchical check)
        const schoolWebAddr = "lghs";
        const school = await prisma.school.findFirst({ where: { webAddr: schoolWebAddr } });
        
        if (school) {
            const activeEvent = await prisma.event.findFirst({
                where: {
                    schoolId: school.id,
                    isActive: true
                }
            });

            const studentAccountsEnabled = activeEvent?.studentAccountsEnabled ?? false;
            const studentSignupsEnabled = activeEvent?.studentSignupsEnabled ?? false;

            if (!activeEvent?.isActive) {
                return { 
                    success: false, 
                    message: "Event is currently in draft mode. Please contact your administrator." 
                };
            }

            if (!studentAccountsEnabled) {
                return { 
                    success: false, 
                    message: "Student accounts are currently disabled. Please contact your administrator." 
                };
            }

            if (!studentSignupsEnabled) {
                return { 
                    success: false, 
                    message: "Student signups are currently disabled. Please contact your administrator." 
                };
            }
        }

        const student = await prisma.student.findFirst({where: {userId: id}});
        const studentId = student?.id;
        if (!studentId) {
            redirect(302, "/login");
        }

        let posIds: Array<{ positionId: string }> = await prisma.positionsOnStudents.findMany({ where: { studentId: studentId }});

        let deleted = false;
        posIds = posIds.filter((val: { positionId: string }) => {
            if (val.positionId == posId) {
                deleted = true;
            }
            return val.positionId != posId;
        });

        if (!deleted) {
            posIds.push({ positionId: posId });
        }

        const positions = posIds.map((val: { positionId: string }, i: number) => {
            return {
                rank: i,
                studentId: student.id,
                positionId: val.positionId,
            };
        })

        await prisma.$transaction([
            prisma.positionsOnStudents.deleteMany({
                where: { studentId: studentId }
            }),
            prisma.positionsOnStudents.createMany({
                data: positions
            })
        ]);

        // Track student participation in the active event
        if (student.schoolId) {
            const activeEventId = await getActiveEventIdForSchool(student.schoolId);
            if (activeEventId) {
                await trackStudentParticipation(studentId, activeEventId);
            }
        }

        return { sent: false, err: false };
    }
}