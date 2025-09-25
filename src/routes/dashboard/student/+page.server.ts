import { redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { prisma } from "$lib/server/prisma";
import { generatePermissionSlipCode } from "$lib/server/auth";
import { sendPermissionSlipEmail } from "$lib/server/email";

export const load: PageServerLoad = async (event) => {
    if (!event.locals.user) {
        redirect(302, "/login");
    }
    if (!event.locals.user.emailVerified) {
        redirect(302, "/verify-email");
    }

    const student = await prisma.student.findFirst({ 
        where: { userId: event.locals.user.id },
        include: { 
            lotteryResult: {
                include: {
                    host: {
                        include: {
                            company: true
                        }
                    }
                }
            },
        }
    });
    
    if (!student) {
        redirect(302, "/dashboard");
    }

    // Check event controls for lottery result visibility
    const activeEvent = await prisma.event.findFirst({
        where: {
            isActive: true
        }
    });

    const eventEnabled = activeEvent?.eventEnabled ?? false;
    const studentAccountsEnabled = activeEvent?.studentAccountsEnabled ?? false;
    const lotteryPublished = activeEvent?.lotteryPublished ?? false;

    // Only show lottery results if event is enabled AND lottery is published
    const showLotteryResult = eventEnabled && lotteryPublished;

    return { 
        lotteryResult: showLotteryResult ? student.lotteryResult : null, 
        permissionSlipCompleted: student.permissionSlipCompleted, 
        parentEmail: student.parentEmail,
        eventEnabled,
        studentAccountsEnabled,
        lotteryPublished,
        showLotteryResult
    };
};


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
    update: async({ request, locals }) => {
        const data = await request.formData();

        const posIdsString = data.get("posIds")?.toString();
        if (!posIdsString) {
            redirect(302, "/about");
        }
        const posIds = JSON.parse(posIdsString).positions;
        if (!posIds) {
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

        const positions = posIds.map((val: string, i: number) => {
            return {
                rank: i,
                studentId: student.id,
                positionId: val,
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
    },
}