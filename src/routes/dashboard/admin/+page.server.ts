import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { archiveEvent, getGraduationEligibleStudents, graduateStudents } from '$lib/server/eventManagement';

export const load: PageServerLoad = async ({ locals }) => {
    console.log('🏠 Admin dashboard load function started');
    console.log('👤 Locals user:', { 
        exists: !!locals.user, 
        id: locals.user?.id, 
        email: locals.user?.email,
        emailVerified: locals.user?.emailVerified 
    });
    
    if (!locals.user) {
        console.log('❌ No user found, redirecting to /admin/login');
        redirect(302, "/admin/login");
    }
    if (!locals.user.emailVerified) {
        console.log('❌ Email not verified, redirecting to /verify-email');
        redirect(302, "/verify-email");
    }

    // Check if user is admin
    console.log('🔍 Checking admin status for user:', locals.user.id);
    const userInfo = await prisma.user.findFirst({
        where: { id: locals.user.id },
        include: { adminOfSchools: true }
    });

    console.log('👑 Admin check result:', { 
        userFound: !!userInfo, 
        userId: userInfo?.id,
        adminOfSchoolsCount: userInfo?.adminOfSchools?.length || 0,
        adminOfSchools: userInfo?.adminOfSchools?.map(s => ({ id: s.id, name: s.name })) || []
    });

    if (!userInfo?.adminOfSchools?.length) {
        console.log('❌ User is not an admin, redirecting to /dashboard');
        redirect(302, "/dashboard");
    }

    const schoolIds = userInfo.adminOfSchools.map(s => s.id);
    console.log('🏫 School IDs for admin:', schoolIds);

    // Get school information
    console.log('🔍 Fetching school information...');
    const schools = await prisma.school.findMany({
        where: { id: { in: schoolIds } },
        select: { id: true, name: true }
    });
    console.log('🏫 Schools found:', schools);

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
            
            // Grade distribution (active students who logged in since event creation)
            prisma.student.groupBy({
                by: ['grade'],
                where: { 
                    schoolId: { in: schoolIds },
                    isActive: true,
                    user: {
                        lastLogin: {
                            gte: upcomingEvent.createdAt
                        }
                    }
                },
                _count: { grade: true }
            })
        ]);

        // Convert grade distribution to object
        gradeStats = {
            freshman: gradeDistribution.find(g => g.grade === 9)?._count.grade || 0,
            sophomore: gradeDistribution.find(g => g.grade === 10)?._count.grade || 0,
            junior: gradeDistribution.find(g => g.grade === 11)?._count.grade || 0,
            senior: gradeDistribution.find(g => g.grade === 12)?._count.grade || 0
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
            
            // Positions for active event (only for companies logged in since event activation)
            prisma.position.count({
                where: {
                    eventId: upcomingEvent.id,
                    host: {
                        user: {
                            lastLogin: {
                                gte: eventStartDate
                            }
                        }
                    }
                }
            }),
            
            // Slots for active event (only for companies logged in since event activation)
            prisma.position.aggregate({
                where: {
                    eventId: upcomingEvent.id,
                    host: {
                        user: {
                            lastLogin: {
                                gte: eventStartDate
                            }
                        }
                    }
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
        console.log("🎓 getGraduationPreview action called");
        
        if (!locals.user) {
            console.log("❌ No user in locals");
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

            console.log("👤 User info:", { 
                userId: locals.user.id, 
                adminSchools: userInfo?.adminOfSchools?.length || 0 
            });

            if (!userInfo?.adminOfSchools?.length) {
                console.log("❌ User not authorized - no admin schools");
                return { success: false, message: "Not authorized", students: [] };
            }

            const schoolId = userInfo.adminOfSchools[0].id;
            console.log("🏫 School ID:", schoolId);
            
            const eligibleStudents = await getGraduationEligibleStudents(schoolId);
            console.log("🎓 Eligible students found:", eligibleStudents.length);
            console.log("📋 Students:", eligibleStudents.map(s => `${s.firstName} ${s.lastName} (Grade ${s.grade})`));

            return { 
                success: true, 
                students: eligibleStudents,
                message: `Found ${eligibleStudents.length} Grade 12 students eligible for graduation`
            };
        } catch (error) {
            console.error('❌ Error getting graduation preview:', error);
            return { 
                success: false, 
                message: "Failed to get graduation preview",
                students: []
            };
        }
    }
};