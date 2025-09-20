import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { getSchoolEvents } from '$lib/server/eventManagement';

export const load: PageServerLoad = async ({ locals, url }) => {
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
    
    // Get school information
    const schools = await prisma.school.findMany({
        where: { id: { in: schoolIds } },
        select: { id: true, name: true }
    });

    // Get all archived events for the schools
    const archivedEvents = await Promise.all(
        schoolIds.map(async (schoolId) => {
            const events = await getSchoolEvents(schoolId, true); // includeArchived = true
            return events.filter(event => event.isArchived);
        })
    );

    // Flatten the events array
    const allArchivedEvents = archivedEvents.flat();

    // Get the selected event ID from URL params
    const selectedEventId = url.searchParams.get('eventId');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let selectedEvent: any = null;
    let selectedEventStats: {
        totalStudents: number;
        permissionSlipsSigned: number;
        studentsWithoutChoices: number;
        totalStudentChoices: number;
        gradeStats: {
            freshman: number;
            sophomore: number;
            junior: number;
            senior: number;
        };
        totalCompanies: number;
        positionsCount: number;
        slotsCount: number;
    } | null = null;

    if (selectedEventId) {
        // Find the selected event
        selectedEvent = allArchivedEvents.find(event => event.id === selectedEventId);
        
        if (selectedEvent) {
            try {
                // Get statistics for the selected archived event
                selectedEventStats = await prisma.student.aggregate({
                where: { schoolId: selectedEvent.schoolId },
                _count: { id: true }
            }).then(async (studentCount) => {
                const [
                    permissionSlipsSigned,
                    studentsWithoutChoices,
                    totalStudentChoices,
                    gradeDistribution,
                    totalCompanies,
                    positionsCount,
                    slotsCount
                ] = await Promise.all([
                    // Permission slips signed
                    prisma.student.count({
                        where: { 
                            schoolId: selectedEvent.schoolId,
                            permissionSlipCompleted: true
                        }
                    }),
                    
                    // Students without choices for this specific event
                    prisma.student.count({
                        where: { 
                            schoolId: selectedEvent.schoolId,
                            positionsSignedUpFor: { 
                                none: {
                                    position: {
                                        eventId: selectedEvent.id
                                    }
                                }
                            }
                        }
                    }),
                    
                    // Total student choices for this specific event
                    prisma.positionsOnStudents.count({
                        where: {
                            student: { schoolId: selectedEvent.schoolId },
                            position: { eventId: selectedEvent.id }
                        }
                    }),
                    
                    // Grade distribution
                    prisma.student.groupBy({
                        by: ['grade'],
                        where: { schoolId: selectedEvent.schoolId },
                        _count: { grade: true }
                    }),
                    
                    // Total companies that participated in this specific event
                    prisma.company.count({
                        where: { 
                            schoolId: selectedEvent.schoolId,
                            hosts: {
                                some: {
                                    positions: {
                                        some: {
                                            eventId: selectedEvent.id
                                        }
                                    }
                                }
                            }
                        }
                    }),
                    
                    // Positions for this event
                    prisma.position.count({
                        where: { eventId: selectedEvent.id }
                    }),
                    
                    // Slots for this event
                    prisma.position.aggregate({
                        where: { eventId: selectedEvent.id },
                        _sum: { slots: true }
                    }).then(res => res._sum.slots || 0)
                ]);

                // Convert grade distribution to object
                const gradeStats = {
                    freshman: gradeDistribution.find(g => g.grade === 9)?._count.grade || 0,
                    sophomore: gradeDistribution.find(g => g.grade === 10)?._count.grade || 0,
                    junior: gradeDistribution.find(g => g.grade === 11)?._count.grade || 0,
                    senior: gradeDistribution.find(g => g.grade === 12)?._count.grade || 0
                };

                const result = {
                    totalStudents: studentCount._count.id,
                    permissionSlipsSigned,
                    studentsWithoutChoices,
                    totalStudentChoices,
                    gradeStats,
                    totalCompanies,
                    positionsCount,
                    slotsCount
                };
                
                return result;
            });
            } catch (error) {
                console.error('Error calculating statistics for event:', selectedEvent.id, error);
                selectedEventStats = null;
            }
        }
    }

    return {
        isAdmin: true,
        loggedIn: true,
        isHost: !!locals.user.host,
        schools,
        archivedEvents: allArchivedEvents,
        selectedEvent,
        selectedEventStats
    };
};
