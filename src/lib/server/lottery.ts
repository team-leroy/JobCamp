import { prisma } from './prisma.js';
import { getCurrentGrade } from './gradeUtils.js';

export async function startLotteryJob(adminId: string) {
    // Get admin's school to find active event
    const admin = await prisma.user.findUnique({
        where: { id: adminId },
        include: { adminOfSchools: true }
    });

    if (!admin?.adminOfSchools?.length) {
        throw new Error('Admin not found or no schools assigned');
    }

    const schoolId = admin.adminOfSchools[0].id;

    // Get the active event for this school
    const activeEvent = await prisma.event.findFirst({
        where: {
            schoolId,
            isActive: true
        }
    });

    if (!activeEvent) {
        throw new Error('No active event found for this school');
    }

    // Clear any existing lottery results for this specific event
    const existingJobs = await prisma.lotteryJob.findMany({
        where: { eventId: activeEvent.id },
        select: { id: true }
    });

    if (existingJobs.length > 0) {
        await prisma.lotteryResults.deleteMany({
            where: {
                lotteryJobId: {
                    in: existingJobs.map(job => job.id)
                }
            }
        });
        await prisma.lotteryJob.deleteMany({
            where: { eventId: activeEvent.id }
        });
    }
    
    // Create job record linked to the active event
    const job = await prisma.lotteryJob.create({
        data: {
            status: 'RUNNING',
            adminId,
            eventId: activeEvent.id,
            startedAt: new Date()
        }
    });

    // Run in background (don't await)
    runLotteryInBackground(job.id);
    
    return job.id;
}

async function runLotteryInBackground(jobId: string) {
    console.log('Starting lottery background job:', jobId);
    try {
        // Initial progress update
        await prisma.lotteryJob.update({
            where: { id: jobId },
            data: { 
                progress: 0,
                currentSeed: 0
            }
        });
        
        // Get the job with event information
        const job = await prisma.lotteryJob.findUnique({
            where: { id: jobId },
            include: {
                event: {
                    select: {
                        id: true,
                        schoolId: true
                    }
                }
            }
        });

        if (!job) {
            throw new Error('Job not found');
        }

        if (!job.event) {
            throw new Error('Event not found for lottery job');
        }

        const schoolId = job.event.schoolId;
        const eventId = job.event.id;

        // Get lottery configuration
        let lotteryConfig = await prisma.lotteryConfiguration.findUnique({
            where: { schoolId },
            include: {
                manualAssignments: true,
                prefillSettings: {
                    include: {
                        company: true
                    }
                }
            }
        });

        // If no config exists, create one with default settings
        if (!lotteryConfig) {
            lotteryConfig = await prisma.lotteryConfiguration.create({
                data: {
                    schoolId,
                    gradeOrder: 'NONE' // Default to random order
                },
                include: {
                    manualAssignments: true,
                    prefillSettings: {
                        include: {
                            company: true
                        }
                    }
                }
            });
        }

        // Get all positions from the specific event
        // Exclude internal testers
        const positions = await prisma.position.findMany({
            where: {
                eventId: eventId,
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
                event: {
                    include: {
                        school: true
                    }
                },
                host: {
                    include: {
                        company: true
                    }
                }
            }
        });

        // Check if there are any positions for the active event
        if (positions.length === 0) {
            throw new Error('No positions found for the active event. Cannot run lottery without positions.');
        }

        // Get the event with date for grade conversion
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: { date: true }
        });

        if (!event) {
            throw new Error('Event not found');
        }

        // Get all students and their preferences for this specific event
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
            include: {
                positionsSignedUpFor: {
                    where: {
                        position: {
                            eventId: eventId
                        }
                    },
                    include: {
                        position: true
                    },
                    orderBy: { rank: 'asc' }
                }
            }
        });

        // Check if students have made choices for the active event
        const studentsWithChoicesRaw = studentsRaw.filter(s => s.positionsSignedUpFor.length > 0);
        if (studentsWithChoicesRaw.length === 0) {
            throw new Error('No student choices found for the active event. The event may be in draft mode or students have not yet signed up. Please ensure the event is properly configured and students have access before running the lottery.');
        }

        // Convert graduatingClassYear to grade for lottery algorithm
        // The lottery algorithm needs grade for sorting, but we store graduatingClassYear
        const students = studentsWithChoicesRaw.map(student => ({
            id: student.id,
            grade: student.graduatingClassYear 
                ? getCurrentGrade(student.graduatingClassYear, event.date)
                : 9, // Default to 9 if missing (shouldn't happen)
            positionsSignedUpFor: student.positionsSignedUpFor.map(pos => ({
                positionId: pos.positionId,
                rank: pos.rank
            }))
        }));

        // Apply manual assignments first
        const manualAssignments = new Map();
        if (lotteryConfig?.manualAssignments) {
            for (const assignment of lotteryConfig.manualAssignments) {
                manualAssignments.set(assignment.studentId, assignment.positionId);
            }
        }

        // Apply prefill settings
        const prefillAssignments = new Map();
        if (lotteryConfig?.prefillSettings) {
            for (const setting of lotteryConfig.prefillSettings) {
                const companyPositions = positions.filter(p => 
                    p.host?.company?.id === setting.companyId
                );
                
                for (const position of companyPositions) {
                    const slotsToFill = Math.floor(position.slots * setting.prefillPercentage / 100);
                    // This is a simplified prefill - in practice you'd want more sophisticated logic
                    prefillAssignments.set(position.id, slotsToFill);
                }
            }
        }

        let bestResult = null;
        let bestCost = Infinity;

        // Your lottery algorithm here
        for (let seed = 1; seed <= 5000; seed++) {
            // Run lottery with this seed
            const result = await runLotteryWithSeed(
                seed, 
                students, 
                positions, 
                manualAssignments,
                prefillAssignments,
                lotteryConfig?.gradeOrder || 'ASCENDING'
            );
            
            // Track the best result
            if (result.cost < bestCost) {
                bestCost = result.cost;
                bestResult = result.assignments;
            }
            
            // Update progress every 100 seeds (less frequent updates for speed)
            if (seed % 100 === 0) {
                const progress = (seed / 5000) * 100;
                
                await prisma.lotteryJob.update({
                    where: { id: jobId },
                    data: { 
                        progress,
                        currentSeed: seed
                    }
                });
                
                // Minimal delay for speed
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }
        
        // Save only the best result to database
        if (bestResult) {
            const resultsToSave = [];
            for (const [studentId, assignment] of Object.entries(bestResult)) {
                if (assignment.positionId) {
                    resultsToSave.push({
                        lotteryJobId: jobId,
                        studentId,
                        positionId: assignment.positionId
                    });
                }
            }

            if (resultsToSave.length > 0) {
                await prisma.lotteryResults.createMany({
                    data: resultsToSave,
                    skipDuplicates: true
                });
            }
        }
        
        // Mark as complete
        await prisma.lotteryJob.update({
            where: { id: jobId },
            data: { 
                status: 'COMPLETED',
                completedAt: new Date()
            }
        });
        
    } catch (error) {
        console.error('Lottery failed with error:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error message:', errorMessage);
        
        await prisma.lotteryJob.update({
            where: { id: jobId },
            data: { 
                status: 'FAILED',
                error: errorMessage.substring(0, 190)
            }
        });
    }
}

interface Student {
    id: string;
    grade: number;
    positionsSignedUpFor: Array<{
        positionId: string;
        rank: number;
    }>;
}

interface Position {
    id: string;
    slots: number;
}

async function runLotteryWithSeed(
    seed: number, 
    students: Student[], 
    positions: Position[], 
    manualAssignments: Map<string, string>,
    prefillAssignments: Map<string, number>,
    gradeOrder: string
) {
    // Your migrated lottery algorithm
    function deepCopy<T>(obj: T): T {
        return JSON.parse(JSON.stringify(obj));
    }
    
    function shuffle<T>(array: T[]): T[] {
        // Fisher-Yates shuffle with seed
        let m = array.length, t, i;
        while (m) {
            i = Math.floor(Math.random() * m--);
            t = array[m];
            array[m] = array[i];
            array[i] = t;
        }
        return array;
    }

    let cost = 0;
    let worstrank = 0;
    const studentsCopy = deepCopy(students);
    
    // Sort students by grade according to configuration
    if (gradeOrder === 'ASCENDING') {
        studentsCopy.sort((a: Student, b: Student) => a.grade - b.grade);
    } else if (gradeOrder === 'DESCENDING') {
        studentsCopy.sort((a: Student, b: Student) => b.grade - a.grade);
    }
    // For 'NONE', we don't sort by grade, just use the shuffled order
    
    shuffle(studentsCopy);
    
    const positionSlots: { [key: string]: number } = {};
    positions.forEach(pos => {
        positionSlots[pos.id] = pos.slots;
    });
    
    // Apply prefill assignments
    for (const [positionId, slotsToFill] of prefillAssignments.entries()) {
        if (positionSlots[positionId]) {
            positionSlots[positionId] = Math.max(0, positionSlots[positionId] - slotsToFill);
        }
    }
    
    const assignments: { [key: string]: { positionId: string | null, rank: number | null } } = {};
    studentsCopy.forEach((s: Student) => {
        assignments[s.id] = { positionId: null, rank: null };
    });

    // Apply manual assignments first
    for (const [studentId, positionId] of manualAssignments.entries()) {
        if (positionSlots[positionId] > 0) {
            assignments[studentId] = { positionId, rank: -1 }; // -1 indicates manual assignment
            positionSlots[positionId] -= 1;
        }
    }

    // Convert student preferences to the format your algorithm expects
    for (let currentRank = 0; currentRank < 10; currentRank++) {
        for (const student of studentsCopy) {
            if (assignments[student.id].positionId !== null) continue;
            
            // Convert positionsSignedUpFor to preferences format
            const sortedPrefs = student.positionsSignedUpFor
                .map((pref) => ({ positionId: pref.positionId, rank: pref.rank }))
                .sort((a, b) => a.rank - b.rank);
            
            for (const pref of sortedPrefs) {
                if (pref.rank !== currentRank) continue;
                const positionId = pref.positionId;
                if (positionSlots[positionId] > 0) {
                    assignments[student.id] = { positionId, rank: pref.rank };
                    positionSlots[positionId] -= 1;
                    cost += pref.rank;
                    if (pref.rank > worstrank) worstrank = pref.rank;
                    break;
                }
            }
        }
    }

    return { assignments, cost };
} 