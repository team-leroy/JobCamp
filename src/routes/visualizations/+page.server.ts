import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { getCurrentGrade } from '$lib/server/gradeUtils';
import type { Prisma } from '@prisma/client';

interface Locals {
    user?: {
        id: string;
        emailVerified: boolean;
        host?: unknown;
    };
}

interface CompanySubscriptionRate {
    totalPositions: number;
    totalSlots: number;
    totalChoices: number;
    averageSubscriptionRate: number;
    positions: Array<{
        title: string;
        slots: number;
        choices: number;
        rate: number;
    }>;
}

interface CompanySubscriptionRates {
    [companyName: string]: CompanySubscriptionRate;
}

interface UserInfo {
    id: string;
    adminOfSchools: Array<{ id: string }>;
}

interface CareerStats {
    totalPositions: number;
    totalSlots: number;
    totalChoices: number;
    totalFilled: number;
    companies: Set<string>;
}

interface CompanyPopularity {
    totalPositions: number;
    totalSlots: number;
    totalChoices: number;
    totalFilled: number;
    careerFields: Set<string>;
}

interface OversubscribedCompany {
    company: string;
    position: string;
    slots: number;
    choices: number;
    rate: number;
}

interface UndersubscribedCompany {
    company: string;
    position: string;
    slots: number;
    choices: number;
}

interface CareerStatsResult {
    career: string;
    totalPositions: number;
    totalSlots: number;
    totalChoices: number;
    totalFilled: number;
    averageChoicesPerPosition: number;
    companies: string[];
}

interface CompanyStatsResult {
    company: string;
    totalPositions: number;
    totalSlots: number;
    totalChoices: number;
    totalFilled: number;
    averageChoicesPerPosition: number;
    careerFields: string[];
}

interface TimelineStats {
    date: string;
    count: number;
}

interface LotteryTimelineStats {
    date: string;
    count: number;
    status: string;
    progress: number;
}

export const load = async ({ locals, url }: { locals: Locals; url: URL }) => {
    try {
        if (!locals.user) {
            redirect(302, "/login");
        }

        // Check if user is admin first - admins can access without email verification
        const userInfo = await prisma.user.findFirst({
            where: { id: locals.user.id },
            include: { adminOfSchools: true }
        });

        if (!userInfo?.adminOfSchools?.length) {
            // For non-admin users, check email verification
            if (!locals.user.emailVerified) {
                redirect(302, "/verify-email");
            }
            redirect(302, "/dashboard");
        }

        // Admins can access without email verification

        const schoolIds = userInfo.adminOfSchools.map(s => s.id);

        // Get all events (active and archived) for the dropdown
        const allEvents = await prisma.event.findMany({
            where: {
                schoolId: { in: schoolIds }
            },
            orderBy: {
                date: 'desc'
            },
            select: {
                id: true,
                name: true,
                date: true,
                isActive: true,
                isArchived: true,
                createdAt: true,
                activatedAt: true
            }
        });

        // Get the selected event from URL parameter, default to active event
        const selectedEventId = url.searchParams.get('eventId');
        let selectedEvent = null;

        if (selectedEventId) {
            // Find the selected event
            selectedEvent = allEvents.find(e => e.id === selectedEventId);
        } else {
            // Default to active event
            selectedEvent = allEvents.find(e => e.isActive);
        }

        // If no event is selected or found, use the first available event
        if (!selectedEvent && allEvents.length > 0) {
            selectedEvent = allEvents[0];
        }

        // Get latest completed lottery results for the selected event only
        let lotteryStats = null;
        let companyStats = null;
        let studentStats = null;
        let timelineStats = null;
        
        if (selectedEvent) {
            try {
                const latestJob = await prisma.lotteryJob.findFirst({
                    where: { 
                        status: 'COMPLETED',
                        eventId: selectedEvent.id  // Filter by selected event
                    },
                    orderBy: { completedAt: 'desc' },
                    include: { 
                        results: true
                    }
                });

                if (latestJob) {
                    // Calculate choice statistics for selected event only
                    lotteryStats = await calculateLotteryStats(latestJob, selectedEvent.id);
                }
                
                // Calculate analytics for selected event only
                companyStats = await calculateCompanyStats(userInfo, selectedEvent.id);
                studentStats = await calculateStudentStats(userInfo, selectedEvent.id);
                timelineStats = await calculateTimelineStats(userInfo, selectedEvent.id);
                
            } catch (lotteryError) {
                console.error('Error fetching lottery stats:', lotteryError);
                // Continue without lottery stats
            }
        }

        const result = {
            isAdmin: true,
            loggedIn: true,
            isHost: !!locals.user.host,
            userRole: userInfo.role,
            selectedEvent,
            allEvents,
            lotteryStats,
            companyStats,
            studentStats,
            timelineStats
        };
        
        return result;
    } catch (error) {
        console.error('Error in visualizations load function:', error);
        throw error;
    }
};

interface LotteryResultWithCreatedAt {
    id: string;
    studentId: string;
    positionId: string;
    lotteryJobId: string;
    createdAt: Date;
}

interface LatestLotteryJob {
    id: string;
    status: string;
    completedAt: Date | null;
    results: LotteryResultWithCreatedAt[];
}

async function calculateLotteryStats(latestJob: LatestLotteryJob, activeEventId: string) {
    try {
        const jobCompletedAt = latestJob.completedAt;

        // Get all students who participated in this event (anyone who even visited the dashboard while it was active)
        // or has at least one position selection.
        const allParticipatedStudents = await prisma.student.findMany({
            where: {
                isActive: true,
                graduatedAt: null,
                OR: [
                    {
                        eventParticipation: {
                            some: {
                                eventId: activeEventId
                            }
                        }
                    },
                    {
                        positionsSignedUpFor: {
                            some: {
                                position: {
                                    eventId: activeEventId
                                }
                            }
                        }
                    }
                ],
                user: {
                    OR: [
                        { role: null },
                        { role: { not: 'INTERNAL_TESTER' } }
                    ]
                }
            },
            include: {
                positionsSignedUpFor: {
                    where: {
                        position: {
                            eventId: activeEventId
                        }
                    },
                    orderBy: { rank: 'asc' },
                    select: { positionId: true }
                },
                lotteryAssignments: {
                    where: {
                        lotteryJobId: latestJob.id
                    }
                }
            }
        });

        const totalStudents = allParticipatedStudents.length;
        
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
            manual: 0,
            notPlaced: 0,
            noChoices: 0
        };

        for (const student of allParticipatedStudents) {
            const assignment = student.lotteryAssignments[0];
            const choices = student.positionsSignedUpFor;

            if (assignment) {
                // Determine if this was a manual claim or lottery placement
                // Any result created after the job completion is considered manual
                const isManualClaim = jobCompletedAt && assignment.createdAt > jobCompletedAt;

                if (isManualClaim) {
                    choiceCounts.manual++;
                } else {
                    // Find which choice this result represents
                    const choiceIndex = choices.findIndex(c => c.positionId === assignment.positionId);
                    
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
                    else choiceCounts.manual++; // Position not in student's choices, but placed during lottery (e.g. manual override)
                }
            } else {
                // No assignment
                if (choices.length === 0) {
                    choiceCounts.noChoices++;
                } else {
                    choiceCounts.notPlaced++;
                }
            }
        }

        // Get positions for this event
        // For archived events, show all positions
        const whereClause: {
            eventId: string;
            students: { some: Record<string, never> };
            host: {
                user: {
                    OR: [
                        { role: null },
                        { role: { not: 'INTERNAL_TESTER' } }
                    ]
                };
            };
        } = {
            eventId: activeEventId,
            students: { some: {} }, // Only positions that have student choices
            host: {
                user: {
                    OR: [
                        { role: null },
                        { role: { not: 'INTERNAL_TESTER' } }
                    ]
                }
            }
        };
        
        const positionsWithCompanies = await prisma.position.findMany({
            where: whereClause,
            include: {
                host: {
                    include: {
                        company: true
                    }
                },
                students: true
            }
        });

        // Calculate company subscription rates
        const companySubscriptionRates: CompanySubscriptionRates = {};
        const totalPositions = positionsWithCompanies.length;
        const totalSlots = positionsWithCompanies.reduce((sum, p) => sum + p.slots, 0);
        const totalChoices = positionsWithCompanies.reduce((sum, p) => sum + p.students.length, 0);

        for (const position of positionsWithCompanies) {
            const companyName = position.host.company?.companyName || 'Unknown Company';
            const subscriptionRate = position.students.length / position.slots;
            
            if (!companySubscriptionRates[companyName]) {
                companySubscriptionRates[companyName] = {
                    totalPositions: 0,
                    totalSlots: 0,
                    totalChoices: 0,
                    averageSubscriptionRate: 0,
                    positions: []
                };
            }
            
            companySubscriptionRates[companyName].totalPositions++;
            companySubscriptionRates[companyName].totalSlots += position.slots;
            companySubscriptionRates[companyName].totalChoices += position.students.length;
            companySubscriptionRates[companyName].positions.push({
                title: position.title,
                slots: position.slots,
                choices: position.students.length,
                rate: subscriptionRate
            });
        }

        // Calculate average subscription rates per company
        for (const companyName in companySubscriptionRates) {
            const company = companySubscriptionRates[companyName];
            company.averageSubscriptionRate = company.totalChoices / company.totalSlots;
        }

        // Convert to array and sort by average subscription rate
        const companySubscriptionStats = Object.entries(companySubscriptionRates)
            .map(([company, stats]: [string, CompanySubscriptionRate]) => ({
                company,
                ...stats
            }))
            .sort((a, b) => b.averageSubscriptionRate - a.averageSubscriptionRate);

        return {
            totalStudents,
            ...choiceCounts,
            companySubscriptionStats,
            totalPositions,
            totalSlots,
            totalChoices,
            overallSubscriptionRate: totalChoices / totalSlots
        };
    } catch (error) {
        console.error('Error calculating lottery stats:', error);
        throw error;
    }
}

async function calculateCompanyStats(userInfo: UserInfo, activeEventId: string) {
    try {
        // Exclude internal testers
        const whereClause: {
            eventId: string;
            isPublished: boolean;
            host: {
                user: {
                    OR: [
                        { role: null },
                        { role: { not: 'INTERNAL_TESTER' } }
                    ]
                };
            };
        } = {
            eventId: activeEventId,
            isPublished: true,
            host: {
                user: {
                    OR: [
                        { role: null },
                        { role: { not: 'INTERNAL_TESTER' } }
                    ]
                }
            }
        };
        
        const positionsWithChoices = await prisma.position.findMany({
            where: whereClause,
            include: {
                host: {
                    include: {
                        company: true
                    }
                },
                students: {
                    include: {
                        student: true
                    }
                },
                lotteryAssignments: true,
                manualAssignments: true
            }
        });

        // Group positions by career field
        const positionsByCareer: Record<string, CareerStats> = {};
        const companyPopularity: Record<string, CompanyPopularity> = {};
        const oversubscribedCompanies: OversubscribedCompany[] = [];
        const undersubscribedCompanies: UndersubscribedCompany[] = [];

        for (const position of positionsWithChoices) {
            const careerField = position.career || 'Other';
            const companyName = position.host.company?.companyName || 'Unknown Company';
            
            // Count only top 3 choices (rank <= 3)
            // Filter by active, non-graduated, non-tester students
            const validStudents = position.students.filter(choice => 
                choice.student.isActive && 
                choice.student.graduatedAt === null &&
                (choice.student.user?.role === null || choice.student.user?.role !== 'INTERNAL_TESTER')
            );
            const top3Choices = validStudents.filter(choice => choice.rank <= 3).length;
            
            // Calculate actual slots filled (manual + lottery)
            const slotsFilled = position.manualAssignments.length + position.lotteryAssignments.length;

            // Track positions by career
            if (!positionsByCareer[careerField]) {
                positionsByCareer[careerField] = {
                    totalPositions: 0,
                    totalSlots: 0,
                    totalChoices: 0,
                    totalFilled: 0,
                    companies: new Set()
                };
            }
            positionsByCareer[careerField].totalPositions++;
            positionsByCareer[careerField].totalSlots += position.slots;
            positionsByCareer[careerField].totalChoices += top3Choices;
            positionsByCareer[careerField].totalFilled += slotsFilled;
            positionsByCareer[careerField].companies.add(companyName);

            // Track company popularity
            if (!companyPopularity[companyName]) {
                companyPopularity[companyName] = {
                    totalPositions: 0,
                    totalSlots: 0,
                    totalChoices: 0,
                    totalFilled: 0,
                    careerFields: new Set()
                };
            }
            companyPopularity[companyName].totalPositions++;
            companyPopularity[companyName].totalSlots += position.slots;
            companyPopularity[companyName].totalChoices += top3Choices;
            companyPopularity[companyName].totalFilled += slotsFilled;
            companyPopularity[companyName].careerFields.add(careerField);

            // Check for oversubscription (using top 3 choices)
            const oversubscriptionRate = top3Choices / position.slots;
            if (oversubscriptionRate > 1) {
                oversubscribedCompanies.push({
                    company: companyName,
                    position: position.title,
                    slots: position.slots,
                    choices: top3Choices,
                    rate: oversubscriptionRate
                });
            } else if (top3Choices === 0) {
                undersubscribedCompanies.push({
                    company: companyName,
                    position: position.title,
                    slots: position.slots,
                    choices: 0
                });
            }
        }

        // Convert Sets to arrays for JSON serialization
        const careerStats: CareerStatsResult[] = Object.entries(positionsByCareer).map(([career, stats]: [string, CareerStats]) => ({
            career,
            totalPositions: stats.totalPositions,
            totalSlots: stats.totalSlots,
            totalChoices: stats.totalChoices,
            totalFilled: stats.totalFilled,
            averageChoicesPerPosition: stats.totalChoices / stats.totalPositions,
            companies: Array.from(stats.companies)
        }));

        const companyStats: CompanyStatsResult[] = Object.entries(companyPopularity).map(([company, stats]: [string, CompanyPopularity]) => ({
            company,
            totalPositions: stats.totalPositions,
            totalSlots: stats.totalSlots,
            totalChoices: stats.totalChoices,
            totalFilled: stats.totalFilled,
            averageChoicesPerPosition: stats.totalChoices / stats.totalPositions,
            careerFields: Array.from(stats.careerFields)
        }));

        // Sort by popularity
        careerStats.sort((a, b) => b.totalChoices - a.totalChoices);
        companyStats.sort((a, b) => b.totalChoices - a.totalChoices);
        oversubscribedCompanies.sort((a, b) => b.rate - a.rate);

        // Create companySubscriptionStats with the same structure as lottery stats
        const companySubscriptionRates: CompanySubscriptionRates = {};
        
        for (const position of positionsWithChoices) {
            const companyName = position.host.company?.companyName || 'Unknown Company';
            const top3Choices = position.students.filter(student => student.rank <= 3).length;
            const subscriptionRate = top3Choices / position.slots;
            
            if (!companySubscriptionRates[companyName]) {
                companySubscriptionRates[companyName] = {
                    totalPositions: 0,
                    totalSlots: 0,
                    totalChoices: 0,
                    averageSubscriptionRate: 0,
                    positions: []
                };
            }
            
            companySubscriptionRates[companyName].totalPositions++;
            companySubscriptionRates[companyName].totalSlots += position.slots;
            companySubscriptionRates[companyName].totalChoices += top3Choices;
            companySubscriptionRates[companyName].positions.push({
                title: position.title,
                slots: position.slots,
                choices: top3Choices,
                rate: subscriptionRate
            });
        }

        // Calculate average subscription rates per company
        for (const companyName in companySubscriptionRates) {
            const company = companySubscriptionRates[companyName];
            company.averageSubscriptionRate = company.totalChoices / company.totalSlots;
        }

        // Convert to array and sort by average subscription rate
        const companySubscriptionStats = Object.entries(companySubscriptionRates)
            .map(([company, stats]: [string, CompanySubscriptionRate]) => ({
                company,
                ...stats
            }))
            .sort((a, b) => b.averageSubscriptionRate - a.averageSubscriptionRate);

        return {
            careerStats,
            companyStats,
            oversubscribedCompanies,
            undersubscribedCompanies,
            companySubscriptionStats,
            totalCompanies: Object.keys(companyPopularity).length,
            totalPositions: positionsWithChoices.length,
            totalSlots: positionsWithChoices.reduce((sum, p) => sum + p.slots, 0),
            totalChoices: positionsWithChoices.reduce((sum, p) => sum + p.students.filter(s => s.rank <= 3).length, 0),
            overallSubscriptionRate: positionsWithChoices.reduce((sum, p) => sum + p.students.filter(s => s.rank <= 3).length, 0) / positionsWithChoices.reduce((sum, p) => sum + p.slots, 0)
        };
    } catch (error) {
        console.error('Error calculating company stats:', error);
        throw error;
    }
}

async function calculateStudentStats(userInfo: UserInfo, activeEventId: string) {
    try {
        // Get the event to determine activation date for filtering and event date for grade conversion
        const event = await prisma.event.findUnique({
            where: { id: activeEventId },
            select: { activatedAt: true, createdAt: true, date: true }
        });
        
        if (!event) {
            throw new Error('Event not found');
        }
        
        const eventData = await prisma.event.findUnique({
            where: { id: activeEventId },
            select: { isActive: true, activatedAt: true, createdAt: true, schoolId: true }
        });

        const allPositions = await prisma.position.findMany({
            where: {
                eventId: activeEventId,
                isPublished: true,
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
            }
        });

        const totalAvailableSlots = allPositions.reduce((sum, p) => sum + p.slots, 0);

        // Build base student query depending on event state
        const baseStudentWhere = {
            schoolId: { in: userInfo.adminOfSchools.map((s: { id: string }) => s.id) }
        };

        const studentInclude = {
            user: {
                select: {
                    lastLogin: true,
                    emailVerified: true
                }
            },
            permissionSlips: {
                where: { eventId: activeEventId },
                take: 1
            },
            positionsSignedUpFor: {
                where: {
                    position: {
                        eventId: activeEventId
                    }
                },
                orderBy: { rank: 'asc' },
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
            }
        };

        let studentsWithChoices: Awaited<ReturnType<typeof prisma.student.findMany>> = [];

        if (eventData?.isActive) {
            // For active events, include students who are active and not graduated
            const activeStudentWhere: Prisma.StudentWhereInput = {
                ...baseStudentWhere,
                isActive: true,
                graduatedAt: null,
                eventParticipation: {
                    some: {
                        eventId: activeEventId
                    }
                },
                user: {
                    OR: [
                        { role: null },
                        { role: { not: 'INTERNAL_TESTER' } }
                    ]
                }
            };

            studentsWithChoices = await prisma.student.findMany({
                where: activeStudentWhere,
                include: studentInclude
            });
        } else {
            // For archived events, prefer students with recorded participation, fall back to those with choices
            studentsWithChoices = await prisma.student.findMany({
                where: {
                    ...baseStudentWhere,
                    eventParticipation: {
                        some: {
                            eventId: activeEventId
                        }
                    }
                },
                include: studentInclude
            });

            if (studentsWithChoices.length === 0) {
                studentsWithChoices = await prisma.student.findMany({
                    where: {
                        ...baseStudentWhere,
                        positionsSignedUpFor: {
                            some: {
                                position: {
                                    eventId: activeEventId
                                }
                            }
                        }
                    },
                    include: studentInclude
                });
            }
        }

        // If still no students found, return zeroed stats
        if (studentsWithChoices.length === 0) {
            return {
                totalStudents: 0,
                totalAvailableSlots,
                gradeDistribution: {},
                choiceDistribution: {},
                slotAvailability: {},
                gradeStats: [],
                choiceStats: [],
                slotStats: [],
                slotAvailabilityStats: [],
                studentsWithNoChoices: [],
                studentsWithManyChoices: [],
                averageChoices: 0,
                averageChoicesPerStudent: 0,
                totalChoices: 0,
                totalStudentsWithChoices: 0,
                emailUnverified: 0,
                noPermissionSlip: 0,
                permissionSlipNoChoices: 0
            };
        }

        // Grade distribution
        const gradeDistribution: Record<number, {
            totalStudents: number;
            studentsWithChoices: number;
            totalChoices: number;
            averageChoices: number;
        }> = {};
        const choiceDistribution: Record<number, number> = {};
        const slotAvailability: Record<number, {
            totalSlots: number;
            studentCount: number;
        }> = {};
        const studentsWithNoChoices: Array<{
            name: string;
            grade: number;
        }> = [];
        const studentsWithManyChoices: Array<{
            name: string;
            grade: number;
            choiceCount: number;
        }> = [];

        for (const student of studentsWithChoices) {
            // Convert graduatingClassYear to grade
            const grade = student.graduatingClassYear 
                ? getCurrentGrade(student.graduatingClassYear, event.date)
                : null;
            
            if (grade === null) {
                continue; // Skip students without graduatingClassYear
            }
            
            const choiceCount = student.positionsSignedUpFor.length;
            const hasPermissionSlip = Array.isArray(student.permissionSlips) && student.permissionSlips.length > 0;

            // Grade distribution
            if (!gradeDistribution[grade]) {
                gradeDistribution[grade] = {
                    totalStudents: 0,
                    studentsWithChoices: 0,
                    totalChoices: 0,
                    averageChoices: 0
                };
            }
            gradeDistribution[grade].totalStudents++;
            gradeDistribution[grade].totalChoices += choiceCount;
            if (choiceCount > 0) {
                gradeDistribution[grade].studentsWithChoices++;
            }

            // Choice distribution - for 0 choices, only count students with permission slip signed (excludes email unverified, no permission slip)
            if (choiceCount === 0) {
                if (hasPermissionSlip) {
                    if (!choiceDistribution[0]) choiceDistribution[0] = 0;
                    choiceDistribution[0]++;
                }
            } else {
                if (!choiceDistribution[choiceCount]) {
                    choiceDistribution[choiceCount] = 0;
                }
                choiceDistribution[choiceCount]++;
            }

            // Students with no choices (permission slip signed but no choices - matches chart)
            if (choiceCount === 0 && hasPermissionSlip) {
                studentsWithNoChoices.push({
                    name: `${student.firstName} ${student.lastName}`,
                    grade: grade
                });
            }

            // Students with many choices (5+)
            if (choiceCount >= 5) {
                studentsWithManyChoices.push({
                    name: `${student.firstName} ${student.lastName}`,
                    grade: grade,
                    choiceCount
                });
            }

            // Calculate total available slots for student's choices
            let totalSlotsAvailable = 0;
            for (const choice of student.positionsSignedUpFor) {
                totalSlotsAvailable += choice.position.slots;
            }

            // For 0 choices, only count in slot stats if they have permission slip (consistent with choice distribution)
            const countInSlotStats = (choiceCount > 0) || (choiceCount === 0 && hasPermissionSlip);
            if (countInSlotStats) {
                if (!slotAvailability[choiceCount]) {
                    slotAvailability[choiceCount] = {
                        totalSlots: 0,
                        studentCount: 0
                    };
                }
                slotAvailability[choiceCount].totalSlots += totalSlotsAvailable;
                slotAvailability[choiceCount].studentCount++;
            }
        }

        // Calculate averages
        Object.keys(gradeDistribution).forEach(grade => {
            const stats = gradeDistribution[parseInt(grade)];
            stats.averageChoices = stats.studentsWithChoices > 0 ? 
                (stats.totalChoices / stats.studentsWithChoices) : 0;
        });

        // Convert to arrays for easier charting
        const gradeStats = Object.entries(gradeDistribution).map(([grade, stats]: [string, {
            totalStudents: number;
            studentsWithChoices: number;
            totalChoices: number;
            averageChoices: number;
        }]) => ({
            grade: parseInt(grade),
            ...stats
        })).sort((a, b) => a.grade - b.grade);

        const choiceStats = Object.entries(choiceDistribution).map(([choices, count]: [string, number]) => ({
            choices: parseInt(choices),
            count
        })).sort((a, b) => a.choices - b.choices);

        const slotStats = Object.entries(slotAvailability).map(([choices, stats]: [string, {
            totalSlots: number;
            studentCount: number;
        }]) => ({
            choices: parseInt(choices),
            averageSlots: stats.studentCount > 0 ? (stats.totalSlots / stats.studentCount) : 0,
            totalSlots: stats.totalSlots,
            studentCount: stats.studentCount
        })).sort((a, b) => a.choices - b.choices);

        // Create a more meaningful slot availability chart
        const slotAvailabilityStats = [
            {
                category: 'Total Available Slots',
                value: totalAvailableSlots,
                color: '#10b981'
            },
            {
                category: 'Total Student Choices',
                value: studentsWithChoices.reduce((sum, s) => sum + s.positionsSignedUpFor.length, 0),
                color: '#3b82f6'
            },
            {
                category: 'Students with Choices',
                value: studentsWithChoices.filter(s => s.positionsSignedUpFor.length > 0).length,
                color: '#8b5cf6'
            },
            {
                category: 'Students with No Choices',
                value: studentsWithNoChoices.length,
                color: '#ef4444'
            }
        ];

        const emailUnverifiedCount = studentsWithChoices.filter(s => s.user && !s.user.emailVerified).length;
        const noPermissionSlipCount = studentsWithChoices.filter(s => !s.permissionSlips || s.permissionSlips.length === 0).length;
        // Students who have permission slip signed but have not made any position choices yet
        const permissionSlipNoChoicesCount = studentsWithChoices.filter(s => {
            const hasPermissionSlip = Array.isArray(s.permissionSlips) && s.permissionSlips.length > 0;
            const hasNoChoices = Array.isArray(s.positionsSignedUpFor) && s.positionsSignedUpFor.length === 0;
            return hasPermissionSlip && hasNoChoices;
        }).length;

        return {
            gradeStats,
            choiceStats,
            slotStats,
            slotAvailabilityStats,
            studentsWithNoChoices,
            studentsWithManyChoices,
            totalStudents: studentsWithChoices.length,
            totalStudentsWithChoices: studentsWithChoices.filter(s => s.positionsSignedUpFor.length > 0).length,
            totalChoices: studentsWithChoices.reduce((sum, s) => sum + s.positionsSignedUpFor.length, 0),
            totalAvailableSlots,
            averageChoicesPerStudent: studentsWithChoices.length > 0 ?
                (studentsWithChoices.reduce((sum, s) => sum + s.positionsSignedUpFor.length, 0) / studentsWithChoices.length) : 0,
            emailUnverified: emailUnverifiedCount,
            noPermissionSlip: noPermissionSlipCount,
            permissionSlipNoChoices: permissionSlipNoChoicesCount
        };
    } catch (error) {
        console.error('Error calculating student stats:', error);
        throw error;
    }
}

async function calculateTimelineStats(userInfo: UserInfo, activeEventId: string) {
    try {
        // Get the active event to use as reference
        const event = await prisma.event.findFirst({
            where: {
                id: activeEventId
            }
        });

        if (!event) {
            return {
                registrationStats: [] as TimelineStats[],
                choiceStats: [] as TimelineStats[],
                companyStats: [] as TimelineStats[],
                positionStats: [] as TimelineStats[],
                lotteryStats: [] as LotteryTimelineStats[],
                eventDate: null,
                totalStudents: 0,
                totalStudentsWithChoices: 0,
                totalChoices: 0,
                totalCompanies: 0,
                totalPositions: 0,
                milestones: {
                    totalStudents: 0,
                    studentsWithChoices: 0,
                    totalCompanies: 0,
                    totalPositions: 0,
                    firstRegistration: null,
                    lastRegistration: null,
                    firstChoice: null,
                    lastChoice: null
                },
                velocity: {
                    totalDays: 0,
                    choiceDays: 0,
                    avgRegistrationsPerDay: 0,
                    avgChoicesPerDay: 0
                }
            };
        }

        // Get the event to determine activation date for filtering
        const eventData = await prisma.event.findUnique({
            where: { id: activeEventId },
            select: { isActive: true, activatedAt: true, createdAt: true }
        });

        // Get all students with their choice data (for active event only)
        // Exclude internal testers, inactive, and graduated students
        const studentWhereClause = {
            schoolId: { in: userInfo.adminOfSchools.map((s: { id: string }) => s.id) },
            isActive: true,
            graduatedAt: null,
            eventParticipation: {
                some: {
                    eventId: activeEventId
                }
            },
            user: {
                OR: [
                    { role: null },
                    { role: { not: 'INTERNAL_TESTER' } }
                ]
            }
        };

        const students = await prisma.student.findMany({
            where: studentWhereClause,
            include: {
                user: true,
                eventParticipation: {
                    where: {
                        eventId: activeEventId
                    }
                },
                positionsSignedUpFor: {
                    where: {
                        position: {
                            eventId: activeEventId
                        }
                    },
                    include: {
                        position: true
                    },
                    orderBy: { rank: 'asc' }
                }
            }
        });

        // Get all companies with their activity data
        // Exclude internal testers and filter by those active in this event
        const companyWhereClause = {
            schoolId: { in: userInfo.adminOfSchools.map((s: { id: string }) => s.id) },
            hosts: {
                some: {
                    user: {
                        OR: [
                            { role: null },
                            { role: { not: 'INTERNAL_TESTER' } }
                        ],
                        lastLogin: {
                            gte: eventData?.createdAt || event.createdAt
                        }
                    }
                }
            }
        };

        const companies = await prisma.company.findMany({
            where: companyWhereClause,
            include: {
                hosts: {
                    include: {
                        user: true,
                        positions: {
                            where: {
                                eventId: activeEventId
                            }
                        }
                    }
                }
            }
        });

        const positionWhereClause = {
            eventId: activeEventId,
            isPublished: true,
            host: {
                user: {
                    OR: [
                        { role: null },
                        { role: { not: 'INTERNAL_TESTER' } }
                    ]
                }
            }
        };

        const positions = await prisma.position.findMany({
            where: positionWhereClause,
            include: {
                host: {
                    include: {
                        company: true
                    }
                }
            }
        });

        // Get lottery jobs for timeline (filter by event, not admin)
        const lotteryJobs = await prisma.lotteryJob.findMany({
            where: {
                eventId: activeEventId
            },
            orderBy: { startedAt: 'desc' }
        });

        // Create timeline based on real data
        const eventDate = new Date(event.date);
        const now = new Date();
        const timelineEndDate = eventData?.isActive ? (now < eventDate ? now : eventDate) : eventDate;
        
        // Create timeline data - use different windows for active vs archived events
        let timelineStart: Date;
        if (eventData?.isActive) {
            // For active events, timeline starts from when the event was created
            // We use createdAt instead of activatedAt because cloning/setup happens right after creation
            const eventStartDate = eventData?.createdAt || event.createdAt;
            timelineStart = new Date(eventStartDate);
        } else {
            // For archived events, use 6 months leading up to the event to capture more activity
            timelineStart = new Date(eventDate);
            timelineStart.setMonth(timelineStart.getMonth() - 6);
        }

        /**
         * Fills in missing dates in a timeline with zero counts
         */
        const fillGaps = (stats: TimelineStats[], start: Date, end: Date) => {
            const map = new Map(stats.map(s => [s.date, s.count]));
            const filled: TimelineStats[] = [];
            const curr = new Date(start);
            curr.setHours(0, 0, 0, 0);
            const stop = new Date(end);
            stop.setHours(0, 0, 0, 0);
            
            while (curr <= stop) {
                const dateStr = curr.toISOString().split('T')[0];
                filled.push({
                    date: dateStr,
                    count: map.get(dateStr) || 0
                });
                curr.setDate(curr.getDate() + 1);
            }
            return filled;
        };
        
        const registrationStats: TimelineStats[] = [];
        const choiceStats: TimelineStats[] = [];
        const companyStats: TimelineStats[] = [];
        const positionStats: TimelineStats[] = [];

        // Registration timeline (prefer eventParticipation dates, fallback to user createdAt)
        const registrationDates = students
            .map(s => {
                const participation = s.eventParticipation.find(p => p.eventId === activeEventId);
                return participation?.createdAt || s.user?.createdAt;
            })
            .filter(date => date && date >= timelineStart && date <= timelineEndDate)
            .sort((a, b) => a!.getTime() - b!.getTime());

        // For archived events, if no registrations in timeline window, try to find any registrations
        // and use a broader window to show the data
        if (registrationDates.length === 0 && !eventData?.isActive) {
            // For archived events, try to find any registrations and use a broader window
            const allRegistrationDates = students
                .map(s => s.user?.createdAt)
                .filter(date => date)
                .sort((a, b) => a!.getTime() - b!.getTime());
            
            if (allRegistrationDates.length > 0) {
                // Use the earliest registration as the start of our timeline
                const earliestRegistration = allRegistrationDates[0]!;
                const broaderTimelineStart = new Date(Math.min(earliestRegistration.getTime(), timelineStart.getTime()));
                
                const broaderRegistrationDates = students
                    .map(s => s.user?.createdAt)
                    .filter(date => date && date >= broaderTimelineStart && date <= timelineEndDate)
                    .sort((a, b) => a!.getTime() - b!.getTime());
                
                if (broaderRegistrationDates.length > 0) {
                    const registrationByDate = new Map();
                    broaderRegistrationDates.forEach(date => {
                        const dateStr = date!.toISOString().split('T')[0];
                        registrationByDate.set(dateStr, (registrationByDate.get(dateStr) || 0) + 1);
                    });

                    registrationByDate.forEach((count, date) => {
                        registrationStats.push({ date, count });
                    });
                }
            }
        } else if (registrationDates.length > 0) {
            // Group registrations by date
            const registrationByDate = new Map();
            registrationDates.forEach(date => {
                const dateStr = date!.toISOString().split('T')[0];
                registrationByDate.set(dateStr, (registrationByDate.get(dateStr) || 0) + 1);
            });

            registrationByDate.forEach((count, date) => {
                registrationStats.push({ date, count });
            });
        }

        // Choice timeline (based on student choices createdAt dates)
        const studentsWithChoices = students.filter(s => s.positionsSignedUpFor.length > 0);
        const totalChoices = studentsWithChoices.reduce((sum, s) => sum + s.positionsSignedUpFor.length, 0);
        
        // Get choice submission dates from PositionsOnStudents createdAt
        // For archived events, if createdAt is null, we can't show timeline data
        const choiceDates = studentsWithChoices
            .flatMap(s => s.positionsSignedUpFor)
            .map(choice => choice.createdAt)
            .filter(date => date && date >= timelineStart && date <= timelineEndDate)
            .sort((a, b) => a!.getTime() - b!.getTime());

        // For archived events, if no choices in timeline window, try to find any choices
        if (choiceDates.length === 0 && !eventData?.isActive) {
            // For archived events, try to find any choices and use a broader window
            const allChoiceDates = studentsWithChoices
                .flatMap(s => s.positionsSignedUpFor)
                .map(choice => choice.createdAt)
                .filter(date => date)
                .sort((a, b) => a!.getTime() - b!.getTime());
            
            if (allChoiceDates.length > 0) {
                // Use the earliest choice as the start of our timeline
                const earliestChoice = allChoiceDates[0]!;
                const broaderTimelineStart = new Date(Math.min(earliestChoice.getTime(), timelineStart.getTime()));
                
                const broaderChoiceDates = studentsWithChoices
                    .flatMap(s => s.positionsSignedUpFor)
                    .map(choice => choice.createdAt)
                    .filter(date => date && date >= broaderTimelineStart && date <= timelineEndDate)
                    .sort((a, b) => a!.getTime() - b!.getTime());
                
                if (broaderChoiceDates.length > 0) {
                    const choiceByDate = new Map();
                    broaderChoiceDates.forEach(date => {
                        const dateStr = date!.toISOString().split('T')[0];
                        choiceByDate.set(dateStr, (choiceByDate.get(dateStr) || 0) + 1);
                    });

                    choiceByDate.forEach((count, date) => {
                        choiceStats.push({ date, count });
                    });
                }
            } else {
                // No choice dates available - this means createdAt is NULL for all choices
                // This happens for events created before the createdAt field was added
                // We'll leave choiceStats empty to indicate no timeline data is available
            }
        } else if (choiceDates.length > 0) {
            // Group choices by date
            const choiceByDate = new Map();
            choiceDates.forEach(date => {
                const dateStr = date!.toISOString().split('T')[0];
                choiceByDate.set(dateStr, (choiceByDate.get(dateStr) || 0) + 1);
            });

            choiceByDate.forEach((count, date) => {
                choiceStats.push({ date, count });
            });
        }

        // Company engagement timeline (count each company once at their earliest engagement in this event)
        const companyEngagementDates = companies.map(c => {
            const allDates: Date[] = [];
            c.hosts.forEach(h => {
                // 1. Check for login during this event
                if (h.user?.lastLogin && h.user.lastLogin >= timelineStart && h.user.lastLogin <= timelineEndDate) {
                    allDates.push(h.user.lastLogin);
                }
                // 2. Check for host creation during this event
                if (h.createdAt && h.createdAt >= timelineStart && h.createdAt <= timelineEndDate) {
                    allDates.push(h.createdAt);
                }
                // 3. Check for published positions created or published during this event (brought forward or new)
                h.positions
                    .filter(p => p.eventId === activeEventId && p.isPublished)
                    .forEach(p => {
                        // Favor publishedAt if available, fallback to createdAt
                        const engagementDate = p.publishedAt || p.createdAt;
                        if (engagementDate && engagementDate >= timelineStart && engagementDate <= timelineEndDate) {
                            allDates.push(engagementDate);
                        }
                    });
            });
            
            if (allDates.length === 0) return null;
            return new Date(Math.min(...allDates.map(d => d.getTime())));
        }).filter((d): d is Date => d !== null);

        // Group companies by date
        const companyByDate: Record<string, number> = {};
        companyEngagementDates.forEach(date => {
            const dateStr = date.toISOString().split('T')[0];
            companyByDate[dateStr] = (companyByDate[dateStr] || 0) + 1;
        });

        Object.entries(companyByDate).forEach(([date, count]) => {
                        companyStats.push({ date, count });
        });

        // Position timeline (based on position publishedAt dates, fallback to createdAt)
        const positionDates = positions
            .map(p => p.publishedAt || p.createdAt)
            .filter(date => date && date >= timelineStart && date <= timelineEndDate)
            .sort((a, b) => a!.getTime() - b!.getTime());

        // For archived events, if no positions in timeline window, try to find any positions
        // Also handle active events if positions exist but are outside the initial window
        if (positionDates.length === 0 && positions.length > 0) {
            // For archived events, try to find any positions and use a broader window
            const allPositionDates = positions
                .map(p => p.publishedAt || p.createdAt)
                .filter(date => date)
                .sort((a, b) => a!.getTime() - b!.getTime());
            
            if (allPositionDates.length > 0) {
                // Use the earliest position as the start of our timeline
                const earliestPosition = allPositionDates[0]!;
                const broaderTimelineStart = new Date(Math.min(earliestPosition.getTime(), timelineStart.getTime()));
                
                const broaderPositionDates = positions
                    .map(p => p.publishedAt || p.createdAt)
                    .filter(date => date && date >= broaderTimelineStart && date <= timelineEndDate)
                    .sort((a, b) => a!.getTime() - b!.getTime());
                
                if (broaderPositionDates.length > 0) {
                    const positionByDate = new Map();
                    broaderPositionDates.forEach(date => {
                        const dateStr = date!.toISOString().split('T')[0];
                        positionByDate.set(dateStr, (positionByDate.get(dateStr) || 0) + 1);
                    });

                    positionByDate.forEach((count, date) => {
                        positionStats.push({ date, count });
                    });
                }
            }
        } else if (positionDates.length > 0) {
            // Group positions by date
            const positionByDate = new Map();
            positionDates.forEach(date => {
                const dateStr = date!.toISOString().split('T')[0];
                positionByDate.set(dateStr, (positionByDate.get(dateStr) || 0) + 1);
            });

            positionByDate.forEach((count, date) => {
                positionStats.push({ date, count });
            });
        }

        // Lottery timeline (based on actual lottery job dates)
        const lotteryStats: LotteryTimelineStats[] = lotteryJobs.map(job => ({
            date: job.startedAt.toISOString().split('T')[0],
            count: 1,
            status: job.status,
            progress: job.progress
        }));

        // Sort original stats for milestones before filling gaps
        registrationStats.sort((a, b) => a.date.localeCompare(b.date));
        choiceStats.sort((a, b) => a.date.localeCompare(b.date));
        companyStats.sort((a, b) => a.date.localeCompare(b.date));
        positionStats.sort((a, b) => a.date.localeCompare(b.date));

        // Determine final start date (the earliest across all data or the default timelineStart)
        let finalTimelineStart = new Date(timelineStart);
        [...registrationStats, ...choiceStats, ...companyStats, ...positionStats].forEach(s => {
            const d = new Date(s.date);
            if (d < finalTimelineStart) finalTimelineStart = d;
        });

        const milestones = {
            totalStudents: students.length,
            studentsWithChoices: studentsWithChoices.length,
            totalCompanies: companies.length,
            totalPositions: positions.length,
            firstRegistration: registrationStats.length > 0 ? registrationStats[0].date : null,
            lastRegistration: registrationStats.length > 0 ? registrationStats[registrationStats.length - 1].date : null,
            firstChoice: choiceStats.length > 0 ? choiceStats[0].date : null,
            lastChoice: choiceStats.length > 0 ? choiceStats[choiceStats.length - 1].date : null
        };

        const velocity = {
            totalDays: registrationStats.length > 0 ? 
                Math.ceil((new Date(registrationStats[registrationStats.length - 1].date).getTime() - 
                          new Date(registrationStats[0].date).getTime()) / (1000 * 60 * 60 * 24)) : 0,
            choiceDays: choiceStats.length > 0 ? 
                Math.ceil((new Date(choiceStats[choiceStats.length - 1].date).getTime() - 
                          new Date(choiceStats[0].date).getTime()) / (1000 * 60 * 60 * 24)) : 0,
            avgRegistrationsPerDay: registrationStats.length > 0 ? 
                registrationStats.reduce((sum, r) => sum + r.count, 0) / registrationStats.length : 0,
            avgChoicesPerDay: choiceStats.length > 0 ? 
                choiceStats.reduce((sum, c) => sum + c.count, 0) / choiceStats.length : 0
        };

        return {
            registrationStats: fillGaps(registrationStats, finalTimelineStart, timelineEndDate),
            choiceStats: fillGaps(choiceStats, finalTimelineStart, timelineEndDate),
            companyStats: fillGaps(companyStats, finalTimelineStart, timelineEndDate),
            positionStats: fillGaps(positionStats, finalTimelineStart, timelineEndDate),
            lotteryStats,
            eventDate: eventDate.toISOString().split('T')[0],
            totalStudents: students.length,
            totalStudentsWithChoices: studentsWithChoices.length,
            totalChoices,
            totalCompanies: companies.length,
            totalPositions: positions.length,
            milestones,
            velocity
        };
    } catch (error) {
        console.error('Error calculating timeline stats:', error);
        throw error;
    }
} 