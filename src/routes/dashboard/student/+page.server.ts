import { redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { prisma } from "$lib/server/prisma";
import { generatePermissionSlipCode, schoolEmailCheck } from "$lib/server/auth";
import { sendPermissionSlipEmail, formatEmailDate, type EventEmailData } from "$lib/server/email";
import { getPermissionSlipStatus } from "$lib/server/permissionSlips";
import { trackStudentParticipation, getActiveEventIdForSchool } from "$lib/server/studentParticipation";

export const load: PageServerLoad = async (event) => {
    if (!event.locals.user) {
        redirect(302, "/login");
    }
    if (!event.locals.user.emailVerified) {
        redirect(302, "/verify-email");
    }

    const student = await prisma.student.findFirst({ 
        where: { userId: event.locals.user.id }
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

    const studentAccountsEnabled = activeEvent?.studentAccountsEnabled ?? false;
    const studentSignupsEnabled = activeEvent?.studentSignupsEnabled ?? false;
    const lotteryPublished = activeEvent?.lotteryPublished ?? false;

    // Only show lottery results if event is active AND lottery is published
    const showLotteryResult = Boolean(activeEvent?.isActive) && lotteryPublished;

    // Load lottery result from the new event-specific LotteryResults table
    let lotteryResult = null;
    if (showLotteryResult && activeEvent) {
        // Find the most recent lottery job for this event
        const lotteryJob = await prisma.lotteryJob.findFirst({
            where: { eventId: activeEvent.id },
            orderBy: { completedAt: 'desc' }
        });

        if (lotteryJob) {
            // Find this student's result in that lottery job
            const result = await prisma.lotteryResults.findFirst({
                where: {
                    studentId: student.id,
                    lotteryJobId: lotteryJob.id
                },
                include: {
                    lotteryJob: true
                }
            });

            if (result) {
                // Load the full position details
                lotteryResult = await prisma.position.findUnique({
                    where: { id: result.positionId },
                    include: {
                        host: {
                            include: {
                                company: true
                            }
                        }
                    }
                });
            }
        }
    }

    // Get permission slip status for the active event
    const permissionSlipStatus = await getPermissionSlipStatus(student.id, student.schoolId!);

    // Load student's position selections
    const positionsOnStudents = await prisma.positionsOnStudents.findMany({
        where: { studentId: student.id },
        orderBy: { rank: "asc" },
        include: { 
            position: {
                include: {
                    host: {
                        include: {
                            company: true
                        }
                    }
                }
            }
        }
    });

    const positions = positionsOnStudents.map(pos => pos.position);

    // Load important dates for the active event
    const importantDates = activeEvent
        ? await prisma.importantDate.findMany({
            where: { eventId: activeEvent.id },
            orderBy: [
                { displayOrder: 'asc' },
                { date: 'asc' }
            ]
        })
        : [];

    return { 
        lotteryResult, 
        permissionSlipCompleted: permissionSlipStatus.hasPermissionSlip, 
        parentEmail: student.parentEmail,
        studentAccountsEnabled,
        studentSignupsEnabled,
        lotteryPublished,
        showLotteryResult,
        activeEventName: permissionSlipStatus.eventName,
        activeEventDate: activeEvent?.date ? activeEvent.date.toISOString() : null,
        hasActiveEvent: permissionSlipStatus.hasActiveEvent,
        positions,
        importantDates
    };
};


export const actions: Actions = {
    sendPermissionSlip: async ({ request, locals }) => {
        const data = await request.formData();

        const parentEmailRaw = data.get("parent-email")?.toString().trim();
        if (!parentEmailRaw) {
            return { sent: false, err: true };
        }

        const id = locals.user?.id;
        if (!id) {
            redirect(302, "/login");
        }

        const user = await prisma.user.findFirst({
            where: { id },
            include: {
                student: {
                    include: {
                        school: true
                    }
                }
            }
        });

        const firstName = user?.student?.firstName;
        const student = user?.student;
        const school = student?.school;
        if (!firstName || !student || !school) {
            redirect(302, "/login");
        }

        const normalizedSchoolDomain = school.emailDomain?.trim().toLowerCase();
        const schoolDomainPattern =
            normalizedSchoolDomain && normalizedSchoolDomain.length > 0
                ? schoolEmailCheck(normalizedSchoolDomain)
                : null;
        const displaySchoolDomain =
            normalizedSchoolDomain && normalizedSchoolDomain.length > 0
                ? normalizedSchoolDomain.startsWith("@")
                    ? normalizedSchoolDomain
                    : `@${normalizedSchoolDomain}`
                : "";

        const normalizedParentEmail = parentEmailRaw.toLowerCase();
        if (
            schoolDomainPattern &&
            schoolDomainPattern.test(normalizedParentEmail)
        ) {
            return {
                sent: false,
                err: true,
                reason: "school-domain",
                schoolDomain: displaySchoolDomain
            };
        }

        const parentEmail = parentEmailRaw;
    
            // Get active event for email templating
            const activeEvent = await prisma.event.findFirst({
                where: {
                    schoolId: student.schoolId!,
                    isActive: true
                }
            });

            if (!activeEvent) {
                return { sent: false, err: true, reason: "school-domain" };
            }

            const eventData: EventEmailData = {
                eventName: activeEvent.name || 'JobCamp',
                eventDate: formatEmailDate(activeEvent.date),
                schoolName: student.school.name,
                schoolId: student.school.id
            };
            
            generatePermissionSlipCode(id).then(
                (code) => sendPermissionSlipEmail(parentEmail.toString(), code, firstName, eventData)
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

        // Track student participation in the active event
        if (student.schoolId) {
            const activeEventId = await getActiveEventIdForSchool(student.schoolId);
            if (activeEventId) {
                await trackStudentParticipation(studentId, activeEventId);
            }
        }
    },
    deletePosition: async({ request, locals }) => {
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

        await prisma.positionsOnStudents.delete({
            where: {
                positionId_studentId: {
                    positionId: posId,
                    studentId: studentId
                }
            }
        });

        // Update ranks
        const remainingPositions = await prisma.positionsOnStudents.findMany({
            where: { studentId: studentId },
            orderBy: { rank: "asc" }
        });

        await prisma.$transaction(
            remainingPositions.map((pos, index) =>
                prisma.positionsOnStudents.update({
                    where: {
                        positionId_studentId: {
                            positionId: pos.positionId,
                            studentId: studentId
                        }
                    },
                    data: { rank: index }
                })
            )
        );
    },
    move: async({ request, locals }) => {
        const data = await request.formData();

        const posId = data.get("id")?.toString();
        const dir = data.get("dir")?.toString();
        
        if (!posId || !dir) {
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

        const positions = await prisma.positionsOnStudents.findMany({
            where: { studentId: studentId },
            orderBy: { rank: "asc" }
        });

        const currentIndex = positions.findIndex(p => p.positionId === posId);
        if (currentIndex === -1) return;

        const newIndex = dir === "up" ? currentIndex - 1 : currentIndex + 1;
        if (newIndex < 0 || newIndex >= positions.length) return;

        // Swap ranks
        await prisma.$transaction([
            prisma.positionsOnStudents.update({
                where: {
                    positionId_studentId: {
                        positionId: positions[currentIndex].positionId,
                        studentId: studentId
                    }
                },
                data: { rank: newIndex }
            }),
            prisma.positionsOnStudents.update({
                where: {
                    positionId_studentId: {
                        positionId: positions[newIndex].positionId,
                        studentId: studentId
                    }
                },
                data: { rank: currentIndex }
            })
        ]);
    },
};