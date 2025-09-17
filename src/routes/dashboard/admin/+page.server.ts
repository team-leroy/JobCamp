import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { archiveEvent } from '$lib/server/eventManagement';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        redirect(302, "/login");
    }
    if (!locals.user.emailVerified) {
        redirect(302, "/verify-email");
    }

    // Check if user is admin
    const userInfo = await prisma.user.findFirst({
        where: { id: locals.user.id },
        include: { adminOfSchools: true }
    });

    if (!userInfo?.adminOfSchools?.length) {
        redirect(302, "/dashboard");
    }

    const schoolIds = userInfo.adminOfSchools.map(s => s.id);
    const currentYear = new Date().getFullYear();

    // Get school information
    const schools = await prisma.school.findMany({
        where: { id: { in: schoolIds } },
        select: { id: true, name: true }
    });

    // Student Statistics
    const [
        totalStudents,
        permissionSlipsSigned,
        studentsWithoutChoices,
        totalStudentChoices,
        gradeDistribution
    ] = await Promise.all([
        // Total students registered
        prisma.student.count({
            where: { schoolId: { in: schoolIds } }
        }),
        
        // Permission slips signed
        prisma.student.count({
            where: { 
                schoolId: { in: schoolIds },
                permissionSlipCompleted: true
            }
        }),
        
        // Students without choices
        prisma.student.count({
            where: { 
                schoolId: { in: schoolIds },
                positionsSignedUpFor: { none: {} }
            }
        }),
        
        // Total student choices
        prisma.positionsOnStudents.count({
            where: {
                student: { schoolId: { in: schoolIds } }
            }
        }),
        
        // Grade distribution
        prisma.student.groupBy({
            by: ['grade'],
            where: { schoolId: { in: schoolIds } },
            _count: { grade: true }
        })
    ]);

    // Convert grade distribution to object
    const gradeStats = {
        freshman: gradeDistribution.find(g => g.grade === 9)?._count.grade || 0,
        sophomore: gradeDistribution.find(g => g.grade === 10)?._count.grade || 0,
        junior: gradeDistribution.find(g => g.grade === 11)?._count.grade || 0,
        senior: gradeDistribution.find(g => g.grade === 12)?._count.grade || 0
    };

    // Get upcoming event
    const upcomingEvent = await prisma.event.findFirst({
        where: {
            schoolId: { in: schoolIds },
            date: {
                gte: new Date()
            }
        },
        orderBy: {
            date: 'asc'
        }
    });

    // Company Statistics
    const [
        totalCompanies,
        companiesLoggedInThisYear,
        positionsThisYear,
        slotsThisYear
    ] = await Promise.all([
        // Total companies present in the DB
        prisma.company.count({
            where: { 
                schoolId: { in: schoolIds }
            }
        }),
        
        // Companies logged in during the current calendar year (Jan-Dec of this year)
        prisma.company.count({
            where: { 
                schoolId: { in: schoolIds },
                hosts: {
                    some: {
                        user: {
                            lastLogin: {
                                gte: new Date(currentYear, 0, 1)
                            }
                        }
                    }
                }
            }
        }),
        
        // Positions this year (only for companies logged in this year)
        prisma.position.count({
            where: {
                event: { schoolId: { in: schoolIds } },
                host: {
                    user: {
                        lastLogin: {
                            gte: new Date(currentYear, 0, 1)
                        }
                    }
                }
            }
        }),
        
        // Slots this year (only for companies logged in this year)
        prisma.position.aggregate({
            where: {
                event: { schoolId: { in: schoolIds } },
                host: {
                    user: {
                        lastLogin: {
                            gte: new Date(currentYear, 0, 1)
                        }
                    }
                }
            },
            _sum: { slots: true }
        }).then(res => res._sum.slots || 0)
    ]);

    return {
        isAdmin: true,
        loggedIn: true,
        isHost: !!locals.user.host,
        upcomingEvent,
        schools,
        studentStats: {
            totalStudents,
            permissionSlipsSigned,
            studentsWithoutChoices,
            totalStudentChoices,
            freshman: gradeStats.freshman,
            sophomore: gradeStats.sophomore,
            junior: gradeStats.junior,
            senior: gradeStats.senior   
        },
        companyStats: {
            totalCompanies,
            companiesLoggedInThisYear,
            positionsThisYear,
            slotsThisYear
        }
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
    }
};