import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { archiveEvent, getGraduationEligibleStudents, graduateStudents } from '$lib/server/eventManagement';
import { getCurrentGrade } from '$lib/server/gradeUtils';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        redirect(302, "/admin/login");
    }

    // Check if user is admin first
    const userInfo = await prisma.user.findFirst({
        where: { id: locals.user.id },
        include: { adminOfSchools: true }
    });

    if (!userInfo?.adminOfSchools?.length) {
        redirect(302, "/dashboard");
    }

    // Admins can access dashboard without email verification
    // Only check email verification for non-admin users (handled by other routes)

    const schoolIds = userInfo.adminOfSchools.map(s => s.id);

    // Get school information
    const schools = await prisma.school.findMany({
        where: { id: { in: schoolIds } },
        select: { id: true, name: true }
    });

    // Get active event first to determine if we should show statistics
    const upcomingEvent = await prisma.event.findFirst({
        where: {
            schoolId: { in: schoolIds },
            isActive: true
        },
        orderBy: {
            date: 'asc'
        }
    });

    // Only calculate statistics if there's an active event
    let studentStats, gradeStats, companyStats;
    
    if (upcomingEvent) {
        // Student Statistics (filtered by active event)
        const [
            totalStudents,
            permissionSlipsSigned,
            studentsWithoutChoices,
            totalStudentChoices,
            gradeDistribution
        ] = await Promise.all([
            // Total active students who have logged in since event creation
            prisma.student.count({
                where: { 
                    schoolId: { in: schoolIds },
                    isActive: true,
                    user: {
                        lastLogin: {
                            gte: upcomingEvent.createdAt
                        }
                    }
                }
            }),
            
            // Permission slips signed for active event (from active students who logged in since event creation)
            prisma.permissionSlipSubmission.count({
                where: {
                    eventId: upcomingEvent.id,
                    student: {
                        schoolId: { in: schoolIds },
                        isActive: true,
                        user: {
                            lastLogin: {
                                gte: upcomingEvent.createdAt
                            }
                        }
                    }
                }
            }),
            
            // Active students without choices for active event (who logged in since event creation)
            prisma.student.count({
                where: { 
                    schoolId: { in: schoolIds },
                    isActive: true,
                    user: {
                        lastLogin: {
                            gte: upcomingEvent.createdAt
                        }
                    },
                    positionsSignedUpFor: {
                        none: {
                            position: {
                                eventId: upcomingEvent.id
                            }
                        }
                    }
                }
            }),
            
            // Total student choices for active event (from active students who logged in since event creation)
            prisma.positionsOnStudents.count({
                where: {
                    student: { 
                        schoolId: { in: schoolIds },
                        isActive: true,
                        user: {
                            lastLogin: {
                                gte: upcomingEvent.createdAt
                            }
                        }
                    },
                    position: { eventId: upcomingEvent.id }
                }
            }),
            
            // Get students to calculate grade distribution (active students who logged in since event creation)
            prisma.student.findMany({
                where: { 
                    schoolId: { in: schoolIds },
                    isActive: true,
                    user: {
                        lastLogin: {
                            gte: upcomingEvent.createdAt
                        }
                    }
                },
                select: {
                    graduatingClassYear: true
                }
            })
        ]);

        // Convert graduatingClassYear to grade and calculate distribution
        const gradeCounts: Record<number, number> = { 9: 0, 10: 0, 11: 0, 12: 0 };
        gradeDistribution.forEach(student => {
            if (student.graduatingClassYear) {
                const grade = getCurrentGrade(student.graduatingClassYear, upcomingEvent.date);
                if (grade >= 9 && grade <= 12) {
                    gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
                }
            }
        });

        gradeStats = {
            freshman: gradeCounts[9] || 0,
            sophomore: gradeCounts[10] || 0,
            junior: gradeCounts[11] || 0,
            senior: gradeCounts[12] || 0
        };

        studentStats = {
            totalStudents,
            permissionSlipsSigned,
            studentsWithoutChoices,
            totalStudentChoices,
            ...gradeStats
        };
    } else {
        // No active event - return empty stats
        studentStats = {
            totalStudents: 0,
            permissionSlipsSigned: 0,
            studentsWithoutChoices: 0,
            totalStudentChoices: 0,
            freshman: 0,
            sophomore: 0,
            junior: 0,
            senior: 0
        };
    }

    // Company Statistics (only if there's an active event)
    if (upcomingEvent) {
        // Use event activation date if available, otherwise use event creation date
        const eventStartDate = upcomingEvent.activatedAt || upcomingEvent.createdAt;
        
        const [
            totalCompanies,
            companiesLoggedInThisEvent,
            positionsThisEvent,
            slotsThisEvent
        ] = await Promise.all([
            // Total companies that have logged in since event creation
            prisma.company.count({
                where: { 
                    schoolId: { in: schoolIds },
                    hosts: {
                        some: {
                            user: {
                                lastLogin: {
                                    gte: upcomingEvent.createdAt
                                }
                            }
                        }
                    }
                }
            }),
            
            // Companies logged in since event activation
            prisma.company.count({
                where: { 
                    schoolId: { in: schoolIds },
                    hosts: {
                        some: {
                            user: {
                                lastLogin: {
                                    gte: eventStartDate
                                }
                            }
                        }
                    }
                }
            }),
            
            // Positions for active event (only published positions)
            prisma.position.count({
                where: {
                    eventId: upcomingEvent.id,
                    isPublished: true
                }
            }),
            
            // Slots for active event (only published positions)
            prisma.position.aggregate({
                where: {
                    eventId: upcomingEvent.id,
                    isPublished: true
                },
                _sum: { slots: true }
            }).then(res => res._sum.slots || 0)
        ]);

        companyStats = {
            totalCompanies,
            companiesLoggedInThisYear: companiesLoggedInThisEvent,
            positionsThisYear: positionsThisEvent,
            slotsThisYear: slotsThisEvent
        };
    } else {
        // No active event - return empty stats
        companyStats = {
            totalCompanies: 0,
            companiesLoggedInThisYear: 0,
            positionsThisYear: 0,
            slotsThisYear: 0
        };
    }

    return {
        isAdmin: true,
        loggedIn: true,
        isHost: !!locals.user.host,
        userRole: userInfo.role,
        upcomingEvent,
        schools,
        studentStats,
        companyStats
    };  
};

export const actions: Actions = {
    archiveEvent: async ({ locals }) => {
        if (!locals.user) {
            return { 
                success: false, 
                message: "User not authenticated" 
            };
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

            // Get the active event for this school
            const activeEvent = await prisma.event.findFirst({
                where: { 
                    schoolId,
                    isActive: true 
                }
            });

            if (!activeEvent) {
                return { success: false, message: "No active event found to archive" };
            }

            // Archive the event
            await archiveEvent(activeEvent.id);

            return { 
                success: true, 
                message: "Event archived successfully" 
            };
        } catch (error) {
            console.error('Error archiving event:', error);
            return { 
                success: false, 
                message: "Failed to archive event" 
            };
        }
    },

    archiveEventWithGraduation: async ({ request, locals }) => {
        if (!locals.user) {
            return { 
                success: false, 
                message: "User not authenticated" 
            };
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
            const formData = await request.formData();
            const graduateStudentsFlag = formData.get('graduateStudents') === 'true';

            // Get the active event for this school
            const activeEvent = await prisma.event.findFirst({
                where: { 
                    schoolId,
                    isActive: true 
                }
            });

            if (!activeEvent) {
                return { success: false, message: "No active event found to archive" };
            }

            // Archive the event first
            await archiveEvent(activeEvent.id);

            let graduationMessage = "";
            if (graduateStudentsFlag) {
                // Get Grade 12 students and graduate them
                const eligibleStudents = await getGraduationEligibleStudents(schoolId);
                
                if (eligibleStudents.length > 0) {
                    const studentIds = eligibleStudents.map(s => s.id);
                    const graduationResult = await graduateStudents(schoolId, studentIds);
                    
                    if (graduationResult.success) {
                        graduationMessage = ` and graduated ${graduationResult.graduatedCount} senior students`;
                    } else {
                        graduationMessage = ` (graduation failed: ${graduationResult.message})`;
                    }
                } else {
                    graduationMessage = " (no Grade 12 students to graduate)";
                }
            }

            return { 
                success: true, 
                message: `Event archived successfully${graduationMessage}` 
            };
        } catch (error) {
            console.error('Error archiving event with graduation:', error);
            return { 
                success: false, 
                message: "Failed to archive event" 
            };
        }
    },

    getGraduationPreview: async ({ locals }) => {
        if (!locals.user) {
            return { 
                success: false, 
                message: "User not authenticated",
                students: []
            };
        }

        try {
            // Get user's school
            const userInfo = await prisma.user.findFirst({
                where: { id: locals.user.id },
                include: { adminOfSchools: true }
            });

            if (!userInfo?.adminOfSchools?.length) {
                return { success: false, message: "Not authorized", students: [] };
            }

            const schoolId = userInfo.adminOfSchools[0].id;
            const eligibleStudents = await getGraduationEligibleStudents(schoolId);

            return { 
                success: true, 
                students: eligibleStudents,
                message: `Found ${eligibleStudents.length} Grade 12 students eligible for graduation`
            };
        } catch (error) {
            console.error('Error getting graduation preview:', error);
            return { 
                success: false, 
                message: "Failed to get graduation preview",
                students: []
            };
        }
    }
};