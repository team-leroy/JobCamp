import { prisma } from '$lib/server/prisma';
import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { generatePermissionSlipCode } from '$lib/server/auth';
import { sendPermissionSlipEmail } from '$lib/server/email';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        redirect(302, "/login");
    }

    const schoolWebAddr = "lghs";

    const school = await prisma.school.findFirst({ where: { webAddr: schoolWebAddr } });

    if (!school) {
        redirect(302, "/");
    }

    const positionData = await prisma.position.findMany({
        where: {
            host: {
                company: {
                    school: {
                        id: school.id
                    }
                }
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

    return { positionData: posData, countSelected: positionsOnStudents.length, permissionSlipCompleted: student.permissionSlipCompleted, parentEmail: student.parentEmail };
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

        return { sent: false, err: false };
    }
}