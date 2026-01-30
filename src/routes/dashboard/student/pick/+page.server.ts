import { prisma } from '$lib/server/prisma';
import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { generatePermissionSlipCode } from '$lib/server/auth';
import { sendPermissionSlipEmail } from '$lib/server/email';
import { getPermissionSlipStatus } from '$lib/server/permissionSlips';
import { trackStudentParticipation, getActiveEventIdForSchool } from '$lib/server/studentParticipation';
import { needsContactInfoVerification } from '$lib/server/contactInfoVerification';

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
    const lotteryPublished = activeEvent?.lotteryPublished ?? false;

    // Student signups require: Event active + Student accounts enabled + Student signups enabled
    const canSignUp = Boolean(activeEvent?.isActive) && studentAccountsEnabled && studentSignupsEnabled;

    const student = await prisma.student.findFirst({where: {userId: locals.user.id}});
    const studentId = student?.id;
    if (!studentId) {
        redirect(302, "/login");
    }

    // Check if student is already assigned a position
    let isAssigned = false;
    if (activeEvent && lotteryPublished) {
        const lotteryJob = await prisma.lotteryJob.findFirst({
            where: { eventId: activeEvent.id },
            orderBy: { completedAt: 'desc' }
        });

        if (lotteryJob) {
            const result = await prisma.lotteryResults.findFirst({
                where: {
                    studentId: studentId,
                    lotteryJobId: lotteryJob.id
                }
            });
            isAssigned = !!result;
        }
    }

    // If lottery is published, we're in "Scramble" mode. 
    // Filter positions to only show those with remaining slots.
    const isScrambleMode = Boolean(activeEvent?.isActive) && lotteryPublished && studentSignupsEnabled;

    let positionData = await prisma.position.findMany({
        where: {
            event: {
                schoolId: school.id,
                isActive: true
            },
            isPublished: true, // Only show published positions to students
            host: {
                user: {
                    OR: [
                        { role: null },
                        { role: { not: 'INTERNAL_TESTER' } }
                    ]
                }
            }
        },
        include: {
            host: {
                select: {
                    company: true
                }
            },
            attachments: true,
            lotteryAssignments: activeEvent ? {
                where: {
                    lotteryJob: {
                        eventId: activeEvent.id
                    }
                }
            } : false
        }
    });

    // If in scramble mode, filter to only show positions with available slots
    if (isScrambleMode) {
        positionData = positionData.filter(pos => {
            const filledSlots = pos.lotteryAssignments?.length || 0;
            return filledSlots < pos.slots;
        });
    }

    // Check if contact info verification is needed for the active event
    const contactInfoVerificationNeeded = await needsContactInfoVerification(
        studentId,
        student.schoolId
    );

    if (contactInfoVerificationNeeded) {
        redirect(302, "/verify-contact-info");
    }

    // Get permission slip status for the active event
    const permissionSlipStatus = await getPermissionSlipStatus(studentId, school.id);

    const positionsOnStudents = activeEvent ? await prisma.positionsOnStudents.findMany({ 
        where: {
            studentId: studentId,
            position: {
                eventId: activeEvent.id
            }
        }
    }) : [];

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
        attachments: Array<{
            id: string;
            fileName: string;
        }>;
        [key: string]: unknown;
    }> = positionData as unknown as Array<{
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
        attachments: Array<{
            id: string;
            fileName: string;
        }>;
        [key: string]: unknown;
    }>;

    return { 
        positionData: posData, 
        countSelected: positionsOnStudents.length, 
        permissionSlipCompleted: permissionSlipStatus.hasPermissionSlip,
        parentEmail: student.parentEmail,
        studentAccountsEnabled,
        studentSignupsEnabled,
        lotteryPublished,
        isScrambleMode,
        isAssigned,
        canSignUp,
        activeEventName: permissionSlipStatus.eventName,
        hasActiveEvent: permissionSlipStatus.hasActiveEvent
    };
}


export const actions: Actions = {
    claimPosition: async ({ request, locals }) => {
        const data = await request.formData();
        const posId = data.get("id")?.toString();

        if (!posId) {
            return fail(400, { message: "Position ID is required." });
        }

        if (!locals.user) {
            redirect(302, "/login");
        }

        const student = await prisma.student.findFirst({ where: { userId: locals.user.id } });
        if (!student) {
            redirect(302, "/login");
        }

        const activeEvent = await prisma.event.findFirst({
            where: {
                schoolId: student.schoolId,
                isActive: true
            }
        });

        if (!activeEvent || !activeEvent.lotteryPublished || !activeEvent.studentSignupsEnabled) {
            return fail(400, { message: "Manual selection is not currently available." });
        }

        // Find the most recent lottery job
        const lotteryJob = await prisma.lotteryJob.findFirst({
            where: { eventId: activeEvent.id },
            orderBy: { completedAt: 'desc' }
        });

        if (!lotteryJob) {
            return fail(400, { message: "Lottery results are not yet available." });
        }

        try {
            const result = await prisma.$transaction(async (tx) => {
                // 1. Check if student is already assigned
                const existingAssignment = await tx.lotteryResults.findFirst({
                    where: {
                        studentId: student.id,
                        lotteryJobId: lotteryJob.id
                    }
                });

                if (existingAssignment) {
                    throw new Error("You are already assigned to a position.");
                }

                // 2. Check position availability
                const position = await tx.position.findUnique({
                    where: { id: posId },
                    include: {
                        lotteryAssignments: {
                            where: { lotteryJobId: lotteryJob.id }
                        }
                    }
                });

                if (!position || position.eventId !== activeEvent.id) {
                    throw new Error("Invalid position selection.");
                }

                if (position.lotteryAssignments.length >= position.slots) {
                    throw new Error("Sorry, this position has just filled up.");
                }

                // 3. Create the assignment
                return await tx.lotteryResults.create({
                    data: {
                        studentId: student.id,
                        positionId: posId,
                        lotteryJobId: lotteryJob.id
                    }
                });
            });

            if (result) {
                // Track participation
                await trackStudentParticipation(student.id, activeEvent.id);
                return { success: true, message: "Position claimed successfully!" };
            }
        } catch (error) {
            console.error("[ClaimPosition] Error:", error);
            return fail(400, { 
                message: error instanceof Error ? error.message : "An unexpected error occurred." 
            });
        }

        return fail(400, { message: "Failed to claim position." });
    },
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
        const school = user?.student?.school;
        if (!firstName || !school) {
            redirect(302, "/login");
        }

        // Get active event for email templating
        const activeEvent = await prisma.event.findFirst({
            where: {
                schoolId: school.id,
                isActive: true
            }
        });

        if (!activeEvent) {
            return { sent: false, err: true };
        }

        const eventData = {
            eventName: activeEvent.name || 'JobCamp',
            eventDate: new Date(activeEvent.date).toLocaleDateString(),
            schoolName: school.name,
            schoolId: school.id
        };
        
        generatePermissionSlipCode(id).then(
            (code) => sendPermissionSlipEmail(parentEmail.toString(), code, firstName, eventData)
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

        // Check permission slip status before allowing selection
        const permissionSlipStatus = await getPermissionSlipStatus(studentId, student.schoolId || "");
        if (!permissionSlipStatus.hasPermissionSlip) {
            return { success: false, message: "Permission slip is required to select favorite jobs." };
        }

        const activeEventId = await getActiveEventIdForSchool(student.schoolId || "");
        if (!activeEventId) {
            return { success: false, message: "No active event found." };
        }

        let posIds: Array<{ positionId: string }> = await prisma.positionsOnStudents.findMany({ 
            where: { 
                studentId: studentId,
                position: {
                    eventId: activeEventId
                }
            }
        });

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
                where: { 
                    studentId: studentId,
                    position: {
                        eventId: activeEventId
                    }
                }
            }),
            prisma.positionsOnStudents.createMany({
                data: positions
            })
        ]);

        await trackStudentParticipation(studentId, activeEventId);

        return { sent: false, err: false };
    }
}