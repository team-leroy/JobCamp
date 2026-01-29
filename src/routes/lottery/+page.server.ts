import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { startLotteryJob } from '$lib/server/lottery';
import { prisma } from '$lib/server/prisma';
import { getCurrentGrade } from '$lib/server/gradeUtils';
import { canAccessFullAdminFeatures } from '$lib/server/roleUtils';

export const load: PageServerLoad = async ({ locals }) => {
    console.log('Lottery page load started');
    
    if (!locals.user) {
        console.log('No user, redirecting to login');
        redirect(302, "/login");
    }
    if (!locals.user.emailVerified) {
        console.log('User not verified, redirecting to verify-email');
        redirect(302, "/verify-email");
    }

    // Check if user is admin
    console.log('Checking user admin status...');
    const userInfo = await prisma.user.findFirst({
        where: { id: locals.user.id },
        include: { adminOfSchools: true }
    });
    console.log('User info:', userInfo?.adminOfSchools?.length, 'admin schools');

    if (!userInfo?.adminOfSchools?.length) {
        console.log('User not admin, redirecting to dashboard');
        redirect(302, "/dashboard");
    }

    // Check if user has full admin access (read-only admins cannot access lottery)
    if (!canAccessFullAdminFeatures(userInfo)) {
        console.log('User is read-only admin, redirecting to dashboard');
        redirect(302, "/dashboard");
    }

    const schoolIds = userInfo.adminOfSchools.map(s => s.id);
    const schoolId = schoolIds[0];

    // Get the active event for this school
    const activeEvent = await prisma.event.findFirst({
        where: {
            schoolId: { in: schoolIds },
            isActive: true
        }
    });

    // Check if lottery is already running for the active event
    const runningLottery = await prisma.lotteryJob.findFirst({
        where: { 
            status: 'RUNNING',
            eventId: activeEvent?.id // Only show running jobs for active event
        }
    });

    // Get latest completed lottery results for the active event
    const latestJob = await prisma.lotteryJob.findFirst({
        where: { 
            status: 'COMPLETED',
            eventId: activeEvent?.id // Only show completed jobs for active event
        },
        orderBy: { completedAt: 'desc' },
        include: { 
            results: {
                include: {
                    student: {
                        include: {
                            positionsSignedUpFor: activeEvent ? {
                                where: {
                                    position: {
                                        eventId: activeEvent.id
                                    }
                                },
                                orderBy: { rank: 'asc' }
                            } : false
                        }
                    },
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
            }
        }
    });

    // Group results by position
    const groupedAssignments = latestJob ? latestJob.results.reduce((acc, result) => {
        const posId = result.positionId;
        if (!acc[posId]) {
            acc[posId] = {
                position: {
                    id: result.position.id,
                    title: result.position.title,
                    slots: result.position.slots,
                    companyName: result.position.host.company?.companyName || 'Unknown'
                },
                students: []
            };
        }

        // Find the rank of this position in the student's favorites
        const favoriteRecord = result.student.positionsSignedUpFor?.find(p => p.positionId === posId);
        const rank = favoriteRecord ? favoriteRecord.rank + 1 : null;

        acc[posId].students.push({
            id: result.student.id,
            firstName: result.student.firstName,
            lastName: result.student.lastName,
            grade: result.student.graduatingClassYear && activeEvent
                ? getCurrentGrade(result.student.graduatingClassYear, activeEvent.date)
                : null,
            assignmentId: result.id,
            rank: rank
        });
        return acc;
    }, {} as Record<string, { 
        position: { id: string, title: string, slots: number, companyName: string }, 
        students: Array<{ id: string, firstName: string, lastName: string, grade: number | null, assignmentId: string, rank: number | null }> 
    }>) : {};

    // Convert to array and sort by company name
    const assignmentsArray = Object.values(groupedAssignments).sort((a, b) => 
        a.position.companyName.localeCompare(b.position.companyName) ||
        a.position.title.localeCompare(b.position.title)
    );

    // Find unassigned students (students who made choices but didn't get a result in latestJob)
    let unassignedStudents: Array<{ id: string, firstName: string, lastName: string, grade: number | null }> = [];
    if (activeEvent && latestJob) {
        const assignedStudentIds = latestJob.results.map(r => r.studentId);
        const unassignedStudentsRaw = await prisma.student.findMany({
            where: {
                schoolId,
                id: { notIn: assignedStudentIds },
                positionsSignedUpFor: {
                    some: {
                        position: {
                            eventId: activeEvent.id
                        }
                    }
                },
                user: {
                    OR: [
                        { role: null },
                        { role: { not: 'INTERNAL_TESTER' } }
                    ]
                }
            },
            orderBy: { lastName: 'asc' },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                graduatingClassYear: true
            }
        });

        unassignedStudents = unassignedStudentsRaw.map(student => ({
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            grade: student.graduatingClassYear 
                ? getCurrentGrade(student.graduatingClassYear, activeEvent.date)
                : null
        }));
    }

    let lotteryStats = null;
    if (latestJob && activeEvent) {
        // Calculate choice statistics
        const stats = await calculateLotteryStats(latestJob.results, activeEvent.id);
        
        // Get admin email
        const admin = await prisma.user.findUnique({
            where: { id: latestJob.adminId },
            select: { email: true }
        });
        
        lotteryStats = {
            ...stats,
            completedAt: latestJob.completedAt?.toISOString(),
            adminEmail: admin?.email || 'Unknown Admin'
        };
    }

    // Get lottery configuration for the first school (assuming single school admin for now)
    console.log('Getting lottery configuration for school:', schoolId);
    let lotteryConfig = await prisma.lotteryConfiguration.findUnique({
        where: { schoolId },
        include: {
            manualAssignments: {
                include: {
                    student: true,
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
            },
            prefillSettings: {
                include: {
                    company: true
                }
            }
        }
    });

    // If no config exists, create one
    if (!lotteryConfig) {
        lotteryConfig = await prisma.lotteryConfiguration.create({
            data: {
                schoolId,
                gradeOrder: 'NONE' // Default to random order
            },
            include: {
                manualAssignments: {
                    include: {
                        student: true,
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
                },
                prefillSettings: {
                    include: {
                        company: true
                    }
                }
            }
        });
    }

    // Get all students for manual assignment dropdown
    // Exclude internal testers
    const studentsRaw = await prisma.student.findMany({
        where: { 
            schoolId,
            user: {
                OR: [
                    { role: null },
                    { role: { not: 'INTERNAL_TESTER' } }
                ]
            }
        },
        orderBy: { lastName: 'asc' },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            graduatingClassYear: true
        }
    });

    // Convert graduatingClassYear to grade for display
    const students = studentsRaw.map(student => ({
        ...student,
        grade: student.graduatingClassYear && activeEvent
            ? getCurrentGrade(student.graduatingClassYear, activeEvent.date)
            : null
    }));

    // Get all positions from the active event for manual assignment dropdown
    // Exclude internal testers
    const positions = await prisma.position.findMany({
        where: {
            event: { 
                schoolId,
                isActive: true 
            },
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
                include: {
                    company: true
                }
            }
        },
        orderBy: [
            { host: { company: { companyName: 'asc' } } },
            { title: 'asc' }
        ]
    });

    // Get all companies for prefill settings
    const companies = await prisma.company.findMany({
        where: { schoolId },
        orderBy: { companyName: 'asc' }
    });

    // Transform positions to match expected interface
    const transformedPositions = positions.map(position => ({
        id: position.id,
        title: position.title,
        host: {
            company: position.host.company ? {
                companyName: position.host.company.companyName,
                companyDescription: position.host.company.companyDescription,
                companyUrl: position.host.company.companyUrl
            } : null
        }
    }));

    // Transform lotteryConfig to match expected interface
    const transformedLotteryConfig = lotteryConfig ? {
        id: lotteryConfig.id,
        schoolId: lotteryConfig.schoolId,
        gradeOrder: lotteryConfig.gradeOrder,
        manualAssignments: lotteryConfig.manualAssignments?.map(ma => ({
            studentId: ma.studentId,
            positionId: ma.positionId,
            student: ma.student ? {
                id: ma.student.id,
                firstName: ma.student.firstName,
                lastName: ma.student.lastName,
                grade: ma.student.graduatingClassYear && activeEvent
                    ? getCurrentGrade(ma.student.graduatingClassYear, activeEvent.date)
                    : null
            } : undefined,
            position: ma.position ? {
                id: ma.position.id,
                title: ma.position.title,
                host: {
                    company: ma.position.host.company ? {
                        companyName: ma.position.host.company.companyName,
                        companyDescription: ma.position.host.company.companyDescription,
                        companyUrl: ma.position.host.company.companyUrl
                    } : null
                }
            } : undefined
        })),
        prefillSettings: lotteryConfig.prefillSettings?.map(ps => ({
            companyId: ps.companyId,
            prefillPercentage: ps.prefillPercentage,
            company: ps.company
        }))
    } : null;

    return {
        isAdmin: true,
        loggedIn: true,
        isHost: !!locals.user.host,
        userRole: userInfo.role,
        lotteryData: {
            isRunning: !!runningLottery,
            progress: runningLottery?.progress || 0,
            currentSeed: runningLottery?.currentSeed || 0,
            results: [], // Empty array for now, will be populated when lottery runs
            stats: lotteryStats || {
                completedAt: undefined,
                adminEmail: '',
                firstChoice: 0,
                secondChoice: 0,
                thirdChoice: 0,
                fourthChoice: 0,
                fifthChoice: 0,
                sixthChoice: 0,
                seventhChoice: 0,
                eighthChoice: 0,
                ninthChoice: 0,
                tenthChoice: 0,
                notPlaced: 0,
                totalStudents: 0
            }
        },
        lotteryConfig: transformedLotteryConfig,
        students,
        positions: transformedPositions,
        companies,
        assignments: assignmentsArray,
        unassignedStudents
    };
}

async function calculateLotteryStats(results: { studentId: string; positionId: string }[], activeEventId: string) {
    // Get all students who made choices for the active event
    // Only count students who have positions from the active event
    // Exclude internal testers
    const allStudentsWithChoices = await prisma.student.findMany({
        where: {
            positionsSignedUpFor: {
                some: {
                    position: {
                        eventId: activeEventId
                    }
                }
            },
            user: {
                OR: [
                    { role: null },
                    { role: { not: 'INTERNAL_TESTER' } }
                ]
            }
        },
        select: { id: true }
    });
    
    const totalStudents = allStudentsWithChoices.length;
    const placedStudents = results.length;
    const notPlacedCount = totalStudents - placedStudents;
    

    
    const choiceCounts = {
        firstChoice: 0,
        secondChoice: 0,
        thirdChoice: 0,
        fourthChoice: 0,
        fifthChoice: 0,
        sixthChoice: 0,
        seventhChoice: 0,
        eighthChoice: 0,
        ninthChoice: 0,
        tenthChoice: 0,
        notPlaced: notPlacedCount
    };

    for (const result of results) {
        // Get student's choices in order for the active event
        const studentChoices = await prisma.positionsOnStudents.findMany({
            where: { 
                studentId: result.studentId,
                position: {
                    eventId: activeEventId
                }
            },
            orderBy: { rank: 'asc' }
        });

        // Find which choice this position represents
        const choiceIndex = studentChoices.findIndex(choice => 
            choice.positionId === result.positionId
        );

        if (choiceIndex === 0) choiceCounts.firstChoice++;
        else if (choiceIndex === 1) choiceCounts.secondChoice++;
        else if (choiceIndex === 2) choiceCounts.thirdChoice++;
        else if (choiceIndex === 3) choiceCounts.fourthChoice++;
        else if (choiceIndex === 4) choiceCounts.fifthChoice++;
        else if (choiceIndex === 5) choiceCounts.sixthChoice++;
        else if (choiceIndex === 6) choiceCounts.seventhChoice++;
        else if (choiceIndex === 7) choiceCounts.eighthChoice++;
        else if (choiceIndex === 8) choiceCounts.ninthChoice++;
        else if (choiceIndex === 9) choiceCounts.tenthChoice++;
        else choiceCounts.notPlaced++; // Position not in student's choices
    }

    return {
        totalStudents,
        ...choiceCounts
    };
}

export const actions: Actions = {
    runLottery: async ({ locals, request }) => {
        if (!locals.user) {
            return { 
                success: false, 
                message: "User not authenticated" 
            };
        }

        try {
            const formData = await request.formData();
            const gradeOrder = formData.get('gradeOrder') as string;

            // Get user's school
            const userInfo = await prisma.user.findFirst({
                where: { id: locals.user.id },
                include: { adminOfSchools: true }
            });

            if (!userInfo?.adminOfSchools?.length) {
                return { success: false, message: "Not authorized" };
            }

            const schoolId = userInfo.adminOfSchools[0].id;

            // Update lottery configuration with current grade order
            if (gradeOrder && ['NONE', 'ASCENDING', 'DESCENDING'].includes(gradeOrder)) {
                await prisma.lotteryConfiguration.upsert({
                    where: { schoolId },
                    update: { gradeOrder },
                    create: { schoolId, gradeOrder }
                });
            }
            
            // Start background job
            const jobId = await startLotteryJob(locals.user.id);
            
            return { 
                success: true, 
                jobId,
                message: "Lottery started. You'll be notified when complete." 
            };
        } catch {
            return { 
                success: false, 
                message: "Failed to start lottery" 
            };
        }
    },

    addManualAssignment: async ({ locals, request }) => {
        if (!locals.user) {
            return { success: false, message: "User not authenticated" };
        }

        const formData = await request.formData();
        const studentId = formData.get('studentId') as string;
        const positionId = formData.get('positionId') as string;

        if (!studentId || !positionId) {
            return { success: false, message: "Student and position are required" };
        }

        try {
            // Get user's school
            const userInfo = await prisma.user.findFirst({
                where: { id: locals.user.id },
                include: { adminOfSchools: true }
            });

            if (!userInfo?.adminOfSchools?.length) {
                return { success: false, message: "Not authorized" };
            }

            const schoolId = userInfo.adminOfSchools[0].id;

            // Get or create lottery configuration
            let config = await prisma.lotteryConfiguration.findUnique({
                where: { schoolId }
            });

            if (!config) {
                config = await prisma.lotteryConfiguration.create({
                    data: { schoolId, gradeOrder: 'NONE' }
                });
            }

            // Add manual assignment
            await prisma.manualAssignment.upsert({
                where: {
                    studentId_positionId: {
                        studentId,
                        positionId
                    }
                },
                update: {
                    positionId
                },
                create: {
                    lotteryConfigurationId: config.id,
                    studentId,
                    positionId
                }
            });

            return { success: true, message: "Manual assignment added" };
        } catch {
            return { success: false, message: "Failed to add manual assignment" };
        }
    },

    removeManualAssignment: async ({ locals, request }) => {
        if (!locals.user) {
            return { success: false, message: "User not authenticated" };
        }

        const formData = await request.formData();
        const studentId = formData.get('studentId') as string;

        if (!studentId) {
            return { success: false, message: "Student ID is required" };
        }

        try {
            // Get user's school
            const userInfo = await prisma.user.findFirst({
                where: { id: locals.user.id },
                include: { adminOfSchools: true }
            });

            if (!userInfo?.adminOfSchools?.length) {
                return { success: false, message: "Not authorized" };
            }

            const schoolId = userInfo.adminOfSchools[0].id;

            // Get lottery configuration
            const config = await prisma.lotteryConfiguration.findUnique({
                where: { schoolId }
            });

            if (!config) {
                return { success: false, message: "No lottery configuration found" };
            }

            // Remove manual assignment
            await prisma.manualAssignment.deleteMany({
                where: {
                    lotteryConfigurationId: config.id,
                    studentId
                }
            });

            return { success: true, message: "Manual assignment removed" };
        } catch {
            return { success: false, message: "Failed to remove manual assignment" };
        }
    },

    updatePrefillSetting: async ({ locals, request }) => {
        if (!locals.user) {
            return { success: false, message: "User not authenticated" };
        }

        const formData = await request.formData();
        const companyId = formData.get('companyId') as string;
        const positionId = formData.get('positionId') as string;
        const slots = parseInt(formData.get('slots') as string);
        const prefillPercentage = parseInt(formData.get('prefillPercentage') as string);

        if (!companyId || !positionId || isNaN(slots) || isNaN(prefillPercentage) || prefillPercentage < 0 || prefillPercentage > 100) {
            return { success: false, message: "Valid company, position, slots, and percentage (0-100) are required" };
        }

        try {
            // Get user's school
            const userInfo = await prisma.user.findFirst({
                where: { id: locals.user.id },
                include: { adminOfSchools: true }
            });

            if (!userInfo?.adminOfSchools?.length) {
                return { success: false, message: "Not authorized" };
            }

            const schoolId = userInfo.adminOfSchools[0].id;

            // Get or create lottery configuration
            let config = await prisma.lotteryConfiguration.findUnique({
                where: { schoolId }
            });

            if (!config) {
                config = await prisma.lotteryConfiguration.create({
                    data: { schoolId, gradeOrder: 'NONE' }
                });
            }

            // Update prefill setting
            await prisma.prefillSetting.upsert({
                where: {
                    companyId_positionId: {
                        companyId,
                        positionId
                    }
                },
                update: {
                    prefillPercentage
                },
                create: {
                    lotteryConfigurationId: config.id,
                    companyId,
                    positionId,
                    slots,
                    prefillPercentage
                }
            });

            return { success: true, message: "Prefill setting updated" };
        } catch {
            return { success: false, message: "Failed to update prefill setting" };
        }
    },

    removePrefillSetting: async ({ locals, request }) => {
        if (!locals.user) {
            return { success: false, message: "User not authenticated" };
        }

        const formData = await request.formData();
        const companyId = formData.get('companyId') as string;

        if (!companyId) {
            return { success: false, message: "Company ID is required" };
        }

        try {
            // Get user's school
            const userInfo = await prisma.user.findFirst({
                where: { id: locals.user.id },
                include: { adminOfSchools: true }
            });

            if (!userInfo?.adminOfSchools?.length) {
                return { success: false, message: "Not authorized" };
            }

            const schoolId = userInfo.adminOfSchools[0].id;

            // Get lottery configuration
            const config = await prisma.lotteryConfiguration.findUnique({
                where: { schoolId }
            });

            if (!config) {
                return { success: false, message: "No lottery configuration found" };
            }

            // Remove prefill setting
            await prisma.prefillSetting.deleteMany({
                where: {
                    lotteryConfigurationId: config.id,
                    companyId
                }
            });

            return { success: true, message: "Prefill setting removed" };
        } catch {
            return { success: false, message: "Failed to remove prefill setting" };
        }
    },

    releaseStudent: async ({ locals, request }) => {
        if (!locals.user) {
            return { success: false, message: "User not authenticated" };
        }

        const formData = await request.formData();
        const assignmentId = formData.get('assignmentId') as string;

        if (!assignmentId) {
            return { success: false, message: "Assignment ID is required" };
        }

        try {
            // Check if user is admin
            const userInfo = await prisma.user.findFirst({
                where: { id: locals.user.id },
                include: { adminOfSchools: true }
            });

            if (!userInfo?.adminOfSchools?.length) {
                return { success: false, message: "Not authorized" };
            }

            // Delete the assignment
            await prisma.lotteryResults.delete({
                where: { id: assignmentId }
            });

            return { success: true, message: "Student released from position" };
        } catch (error) {
            console.error("[ReleaseStudent] Error:", error);
            return { success: false, message: "Failed to release student" };
        }
    }
};