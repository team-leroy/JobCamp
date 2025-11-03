import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { getCurrentGrade } from '$lib/server/gradeUtils';

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
    companies: Set<string>;
}

interface CompanyPopularity {
    totalPositions: number;
    totalSlots: number;
    totalChoices: number;
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
    averageChoicesPerPosition: number;
    companies: string[];
}

interface CompanyStatsResult {
    company: string;
    totalPositions: number;
    totalSlots: number;
    totalChoices: number;
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
            console.log('🔍 DEBUG: Selected event:', {
                id: selectedEvent.id,
                name: selectedEvent.name,
                date: selectedEvent.date,
                isActive: selectedEvent.isActive,
                isArchived: selectedEvent.isArchived
            });
            
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

                console.log('🔍 DEBUG: Latest lottery job:', latestJob ? {
                    id: latestJob.id,
                    eventId: latestJob.eventId,
                    status: latestJob.status,
                    resultsCount: latestJob.results.length
                } : 'No lottery job found');

                if (latestJob) {
                    // Calculate choice statistics for selected event only
                    lotteryStats = await calculateLotteryStats(latestJob.results, selectedEvent.id);
                    console.log('🔍 DEBUG: Lottery stats calculated:', lotteryStats ? 'Success' : 'Failed');
                }
                
                // Calculate analytics for selected event only
                companyStats = await calculateCompanyStats(userInfo, selectedEvent.id);
                console.log('🔍 DEBUG: Company stats calculated:', companyStats ? 'Success' : 'Failed');
                
                studentStats = await calculateStudentStats(userInfo, selectedEvent.id);
                console.log('🔍 DEBUG: Student stats calculated:', studentStats ? 'Success' : 'Failed');
                
                timelineStats = await calculateTimelineStats(userInfo, selectedEvent.id);
                console.log('🔍 DEBUG: Timeline stats calculated:', timelineStats ? 'Success' : 'Failed');
                
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
        
        console.log('🔍 DEBUG: Final result:', {
            selectedEventId: selectedEvent?.id,
            selectedEventName: selectedEvent?.name,
            lotteryStatsExists: !!lotteryStats,
            companyStatsExists: !!companyStats,
            studentStatsExists: !!studentStats,
            timelineStatsExists: !!timelineStats
        });
        
        return result;
    } catch (error) {
        console.error('Error in visualizations load function:', error);
        throw error;
    }
};

async function calculateLotteryStats(results: { studentId: string; positionId: string }[], activeEventId: string) {
    try {
        console.log('🔍 DEBUG: calculateLotteryStats called with:', {
            resultsCount: results.length,
            activeEventId
        });
        
        // Get all students who participated in this event
        // For archived events, fall back to students with position choices if no participation records exist
        let allStudentsWithChoices = await prisma.student.findMany({
            where: {
                eventParticipation: {
                    some: {
                        eventId: activeEventId
                    }
                }
            },
            select: { id: true }
        });
        
        console.log('🔍 DEBUG: Students with participation records:', allStudentsWithChoices.length);
        
        // If no participation records found (e.g., for old archived events), fall back to students with choices
        if (allStudentsWithChoices.length === 0) {
            allStudentsWithChoices = await prisma.student.findMany({
                where: {
                    positionsSignedUpFor: {
                        some: {
                            position: {
                                eventId: activeEventId
                            }
                        }
                    }
                },
                select: { id: true }
            });
            console.log('🔍 DEBUG: Students with position choices (fallback):', allStudentsWithChoices.length);
        }
        
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

        // Get the event to determine activation date for filtering
        const event = await prisma.event.findUnique({
            where: { id: activeEventId },
            select: { activatedAt: true, createdAt: true }
        });
        
        const eventStartDate = event?.activatedAt || event?.createdAt;
        
        // Get positions from companies that have logged in since event activation
        // For archived events, show all positions regardless of login date
        const whereClause: {
            eventId: string;
            students: { some: Record<string, never> };
            host?: {
                user: {
                    lastLogin: {
                        gte: Date;
                    };
                };
            };
        } = {
            eventId: activeEventId,
            students: { some: {} } // Only positions that have student choices
        };
        
        // Only filter by login date for active events
        const eventData = await prisma.event.findUnique({
            where: { id: activeEventId },
            select: { isActive: true, activatedAt: true, createdAt: true }
        });
        
        if (eventData?.isActive && eventStartDate) {
            whereClause.host = {
                user: {
                    lastLogin: {
                        gte: eventStartDate
                    }
                }
            };
        }
        
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

        for (const result of results) {
            // Get student's choices in order for the active event only
            const studentChoices = await prisma.positionsOnStudents.findMany({
                where: { 
                    studentId: result.studentId,
                    position: {
                        eventId: activeEventId
                    }
                },
                orderBy: { rank: 'asc' },
                select: { positionId: true }
            });

            // Find which choice this result represents
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
        // Get the event to determine activation date for filtering
        const event = await prisma.event.findUnique({
            where: { id: activeEventId },
            select: { activatedAt: true, createdAt: true }
        });
        
        const eventStartDate = event?.activatedAt || event?.createdAt;
        
        // Get positions from companies that have logged in since event activation
        // For archived events, show all positions regardless of login date
        const whereClause: {
            eventId: string;
            isPublished: boolean;
            host?: {
                user: {
                    lastLogin: {
                        gte: Date;
                    };
                };
            };
        } = {
            eventId: activeEventId,
            isPublished: true
        };
        
        // Only filter by login date for active events
        const eventData = await prisma.event.findUnique({
            where: { id: activeEventId },
            select: { isActive: true, activatedAt: true, createdAt: true }
        });
        
        if (eventData?.isActive && eventStartDate) {
            whereClause.host = {
                user: {
                    lastLogin: {
                        gte: eventStartDate
                    }
                }
            };
        }
        
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
                }
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
            const top3Choices = position.students.filter(student => student.rank <= 3).length;
            
            // Track positions by career
            if (!positionsByCareer[careerField]) {
                positionsByCareer[careerField] = {
                    totalPositions: 0,
                    totalSlots: 0,
                    totalChoices: 0,
                    companies: new Set()
                };
            }
            positionsByCareer[careerField].totalPositions++;
            positionsByCareer[careerField].totalSlots += position.slots;
            positionsByCareer[careerField].totalChoices += top3Choices;
            positionsByCareer[careerField].companies.add(companyName);

            // Track company popularity
            if (!companyPopularity[companyName]) {
                companyPopularity[companyName] = {
                    totalPositions: 0,
                    totalSlots: 0,
                    totalChoices: 0,
                    careerFields: new Set()
                };
            }
            companyPopularity[companyName].totalPositions++;
            companyPopularity[companyName].totalSlots += position.slots;
            companyPopularity[companyName].totalChoices += top3Choices;
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
            averageChoicesPerPosition: stats.totalChoices / stats.totalPositions,
            companies: Array.from(stats.companies)
        }));

        const companyStats: CompanyStatsResult[] = Object.entries(companyPopularity).map(([company, stats]: [string, CompanyPopularity]) => ({
            company,
            totalPositions: stats.totalPositions,
            totalSlots: stats.totalSlots,
            totalChoices: stats.totalChoices,
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
        
        const eventStartDate = event?.activatedAt || event?.createdAt;
        
        // Get positions from companies that have logged in since event activation
        // For archived events, show all positions regardless of login date
        const whereClause: {
            eventId: string;
            isPublished: boolean;
            host?: {
                user: {
                    lastLogin: {
                        gte: Date;
                    };
                };
            };
        } = {
            eventId: activeEventId,
            isPublished: true
        };
        
        // Only filter by login date for active events
        const eventData = await prisma.event.findUnique({
            where: { id: activeEventId },
            select: { isActive: true, activatedAt: true, createdAt: true }
        });
        
        if (eventData?.isActive && eventStartDate) {
            whereClause.host = {
                user: {
                    lastLogin: {
                        gte: eventStartDate
                    }
                }
            };
        }
        
        const allPositions = await prisma.position.findMany({
            where: whereClause,
            include: {
                host: {
                    include: {
                        company: true
                    }
                }
            }
        });

        const totalAvailableSlots = allPositions.reduce((sum, p) => sum + p.slots, 0);

        // Get students who participated in this event
        // For archived events, fall back to students with position choices if no participation records exist
        let studentsWithChoices = await prisma.student.findMany({
            where: {
                schoolId: { in: userInfo.adminOfSchools.map((s: { id: string }) => s.id) },
                eventParticipation: {
                    some: {
                        eventId: activeEventId
                    }
                }
            },
            include: {
                positionsSignedUpFor: {
                    where: {
                        position: {
                            eventId: activeEventId
                        }
                    },
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
                    },
                    orderBy: { rank: 'asc' }
                }
            }
        });
        
        // If no participation records found (e.g., for old archived events), fall back to students with choices
        if (studentsWithChoices.length === 0) {
            studentsWithChoices = await prisma.student.findMany({
                where: {
                    schoolId: { in: userInfo.adminOfSchools.map((s: { id: string }) => s.id) },
                    positionsSignedUpFor: {
                        some: {
                            position: {
                                eventId: activeEventId
                            }
                        }
                    }
                },
                include: {
                    positionsSignedUpFor: {
                        where: {
                            position: {
                                eventId: activeEventId
                            }
                        },
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
                        },
                        orderBy: { rank: 'asc' }
                    }
                }
            });
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

            // Choice distribution
            if (!choiceDistribution[choiceCount]) {
                choiceDistribution[choiceCount] = 0;
            }
            choiceDistribution[choiceCount]++;

            // Students with no choices
            if (choiceCount === 0) {
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

            if (!slotAvailability[choiceCount]) {
                slotAvailability[choiceCount] = {
                    totalSlots: 0,
                    studentCount: 0
                };
            }
            slotAvailability[choiceCount].totalSlots += totalSlotsAvailable;
            slotAvailability[choiceCount].studentCount++;
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
                value: studentsWithChoices.filter(s => s.positionsSignedUpFor.length === 0).length,
                color: '#ef4444'
            }
        ];

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
                (studentsWithChoices.reduce((sum, s) => sum + s.positionsSignedUpFor.length, 0) / studentsWithChoices.length) : 0
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
        
        const eventStartDate = eventData?.activatedAt || eventData?.createdAt;

        // Get all students with their choice data (for active event only)
        // For active events, only include students who have logged in since event creation
        const studentWhereClause: {
            schoolId: { in: string[] };
            user?: {
                lastLogin: {
                    gte: Date;
                };
            };
        } = {
            schoolId: { in: userInfo.adminOfSchools.map((s: { id: string }) => s.id) }
        };
        
        // Only filter by login date for active events
        if (eventData?.isActive && eventStartDate) {
            studentWhereClause.user = {
                lastLogin: {
                    gte: eventStartDate
                }
            };
        }

        const students = await prisma.student.findMany({
            where: studentWhereClause,
            include: {
                user: true,
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
        // For active events, only include companies that have logged in since event creation
        const companyWhereClause: {
            schoolId: { in: string[] };
            hosts?: {
                some: {
                    user: {
                        lastLogin: {
                            gte: Date;
                        };
                    };
                };
            };
        } = {
            schoolId: { in: userInfo.adminOfSchools.map((s: { id: string }) => s.id) }
        };
        
        // Only filter by login date for active events
        if (eventData?.isActive && eventStartDate) {
            companyWhereClause.hosts = {
                some: {
                    user: {
                        lastLogin: {
                            gte: eventStartDate
                        }
                    }
                }
            };
        }

        const companies = await prisma.company.findMany({
            where: companyWhereClause,
            include: {
                hosts: {
                    include: {
                        user: true,
                        positions: true
                    }
                }
            }
        });

        // Get all positions from the active event
        // For active events, only include positions from companies that have logged in since event creation
        const positionWhereClause: {
            eventId: string;
            host?: {
                user: {
                    lastLogin: {
                        gte: Date;
                    };
                };
            };
        } = {
            eventId: activeEventId,
            isPublished: true
        };
        
        // Only filter by login date for active events
        if (eventData?.isActive && eventStartDate) {
            positionWhereClause.host = {
                user: {
                    lastLogin: {
                        gte: eventStartDate
                    }
                }
            };
        }

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
        
        // Create timeline data - use different windows for active vs archived events
        let timelineStart: Date;
        if (eventData?.isActive) {
            // For active events, use 3 months leading up to the event
            timelineStart = new Date(eventDate);
            timelineStart.setMonth(timelineStart.getMonth() - 3);
        } else {
            // For archived events, use 6 months leading up to the event to capture more activity
            timelineStart = new Date(eventDate);
            timelineStart.setMonth(timelineStart.getMonth() - 6);
        }
        
        const registrationStats: TimelineStats[] = [];
        const choiceStats: TimelineStats[] = [];
        const companyStats: TimelineStats[] = [];
        const positionStats: TimelineStats[] = [];

        // Generate timeline data based on real student activity
        const studentUsers = students.filter(s => s.user);
        const hostUsers = companies.flatMap(c => c.hosts).filter(h => h.user);

        // Registration timeline (based on user createdAt dates)
        const registrationDates = studentUsers
            .map(s => s.user?.createdAt)
            .filter(date => date && date >= timelineStart && date <= eventDate)
            .sort((a, b) => a!.getTime() - b!.getTime());

        // For archived events, if no registrations in timeline window, try to find any registrations
        // and use a broader window to show the data
        if (registrationDates.length === 0 && !eventData?.isActive) {
            // For archived events, try to find any registrations and use a broader window
            const allRegistrationDates = studentUsers
                .map(s => s.user?.createdAt)
                .filter(date => date)
                .sort((a, b) => a!.getTime() - b!.getTime());
            
            if (allRegistrationDates.length > 0) {
                // Use the earliest registration as the start of our timeline
                const earliestRegistration = allRegistrationDates[0]!;
                const broaderTimelineStart = new Date(Math.min(earliestRegistration.getTime(), timelineStart.getTime()));
                
                const broaderRegistrationDates = studentUsers
                    .map(s => s.user?.createdAt)
                    .filter(date => date && date >= broaderTimelineStart && date <= eventDate)
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
            .filter(date => date && date >= timelineStart && date <= eventDate)
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
                    .filter(date => date && date >= broaderTimelineStart && date <= eventDate)
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

        // Company engagement timeline (based on host createdAt dates)
        const hostActivityDates = hostUsers
            .map(h => h.createdAt)
            .filter(date => date && date >= timelineStart && date <= eventDate)
            .sort((a, b) => a!.getTime() - b!.getTime());

        // For archived events, if no company activity in timeline window, try to find any activity
        if (hostActivityDates.length === 0 && !eventData?.isActive) {
            // For archived events, try to find any company activity and use a broader window
            const allHostActivityDates = hostUsers
                .map(h => h.createdAt)
                .filter(date => date)
                .sort((a, b) => a!.getTime() - b!.getTime());
            
            if (allHostActivityDates.length > 0) {
                // Use the earliest activity as the start of our timeline
                const earliestActivity = allHostActivityDates[0]!;
                const broaderTimelineStart = new Date(Math.min(earliestActivity.getTime(), timelineStart.getTime()));
                
                const broaderHostActivityDates = hostUsers
                    .map(h => h.createdAt)
                    .filter(date => date && date >= broaderTimelineStart && date <= eventDate)
                    .sort((a, b) => a!.getTime() - b!.getTime());
                
                if (broaderHostActivityDates.length > 0) {
                    const companyByDate = new Map();
                    broaderHostActivityDates.forEach(date => {
                        const dateStr = date!.toISOString().split('T')[0];
                        companyByDate.set(dateStr, (companyByDate.get(dateStr) || 0) + 1);
                    });

                    companyByDate.forEach((count, date) => {
                        companyStats.push({ date, count });
                    });
                }
            }
        } else if (hostActivityDates.length > 0) {
            const companyByDate = new Map();
            hostActivityDates.forEach(date => {
                const dateStr = date!.toISOString().split('T')[0];
                companyByDate.set(dateStr, (companyByDate.get(dateStr) || 0) + 1);
            });

            companyByDate.forEach((count, date) => {
                companyStats.push({ date, count });
            });
        }

        // Position creation timeline (based on position createdAt dates)
        const positionDates = positions
            .map(p => p.createdAt)
            .filter(date => date && date >= timelineStart && date <= eventDate)
            .sort((a, b) => a!.getTime() - b!.getTime());

        // For archived events, if no positions in timeline window, try to find any positions
        if (positionDates.length === 0 && !eventData?.isActive) {
            // For archived events, try to find any positions and use a broader window
            const allPositionDates = positions
                .map(p => p.createdAt)
                .filter(date => date)
                .sort((a, b) => a!.getTime() - b!.getTime());
            
            if (allPositionDates.length > 0) {
                // Use the earliest position as the start of our timeline
                const earliestPosition = allPositionDates[0]!;
                const broaderTimelineStart = new Date(Math.min(earliestPosition.getTime(), timelineStart.getTime()));
                
                const broaderPositionDates = positions
                    .map(p => p.createdAt)
                    .filter(date => date && date >= broaderTimelineStart && date <= eventDate)
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

        return {
            registrationStats: registrationStats.sort((a, b) => a.date.localeCompare(b.date)),
            choiceStats: choiceStats.sort((a, b) => a.date.localeCompare(b.date)),
            companyStats: companyStats.sort((a, b) => a.date.localeCompare(b.date)),
            positionStats: positionStats.sort((a, b) => a.date.localeCompare(b.date)),
            lotteryStats,
            eventDate: eventDate.toISOString().split('T')[0],
            totalStudents: students.length,
            totalStudentsWithChoices: studentsWithChoices.length,
            totalChoices,
            totalCompanies: companies.length,
            totalPositions: positions.length,
            milestones: {
                totalStudents: students.length,
                studentsWithChoices: studentsWithChoices.length,
                totalCompanies: companies.length,
                totalPositions: positions.length,
                firstRegistration: registrationStats.length > 0 ? registrationStats[0].date : null,
                lastRegistration: registrationStats.length > 0 ? registrationStats[registrationStats.length - 1].date : null,
                firstChoice: choiceStats.length > 0 ? choiceStats[0].date : null,
                lastChoice: choiceStats.length > 0 ? choiceStats[choiceStats.length - 1].date : null
            },
            velocity: {
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
            }
        };
    } catch (error) {
        console.error('Error calculating timeline stats:', error);
        throw error;
    }
} 