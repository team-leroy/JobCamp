import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

// Mock Prisma
const mockPrisma = {
    student: {
        findFirst: vi.fn()
    },
    event: {
        findFirst: vi.fn()
    },
    lotteryJob: {
        findFirst: vi.fn()
    },
    lotteryResults: {
        findFirst: vi.fn()
    },
    position: {
        findUnique: vi.fn()
    },
    positionsOnStudents: {
        findMany: vi.fn(),
        delete: vi.fn(),
        update: vi.fn()
    },
    importantDate: {
        findMany: vi.fn()
    },
    studentEventParticipation: {
        findUnique: vi.fn()
    },
    $transaction: vi.fn()
};

// Mock modules
vi.mock('$lib/server/prisma', () => ({
    prisma: mockPrisma,
    luciaAuthDb: {}
}));

vi.mock('$lib/server/permissionSlips', () => ({
    getPermissionSlipStatus: vi.fn().mockResolvedValue({
        hasPermissionSlip: true,
        eventName: 'Test Event',
        hasActiveEvent: true
    })
}));

vi.mock('$lib/server/contactInfoVerification', () => ({
    needsContactInfoVerification: vi.fn().mockResolvedValue(false)
}));

vi.mock('@sveltejs/kit', async () => {
    const actual = await vi.importActual('@sveltejs/kit');
    return {
        ...actual,
        redirect: vi.fn((status: number, location: string) => {
            throw { status, location };
        })
    };
});

describe('Student Dashboard Server', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default mock for importantDate to return empty array
        mockPrisma.importantDate.findMany.mockResolvedValue([]);
    });

    const createMockEvent = (locals: App.Locals) => ({
        locals,
        url: new URL('http://localhost/dashboard/student')
    }) as unknown as RequestEvent;

    const mockStudent = {
        id: 'student-1',
        userId: 'user-1',
        parentEmail: 'parent@test.com',
        schoolId: 'school-1',
        firstName: 'Test',
        lastName: 'Student'
    };

    const mockActiveEvent = {
        id: 'event-1',
        name: 'Test Event 2025',
        isActive: true,
        studentAccountsEnabled: true,
        studentSignupsEnabled: true,
        lotteryPublished: true,
        companyAccountsEnabled: true,
        schoolId: 'school-1'
    };

    const mockPosition = {
        id: 'position-1',
        title: 'Software Engineer',
        career: 'Technology',
        slots: 5,
        host: {
            company: {
                companyName: 'Tech Corp',
                companyDescription: 'A tech company',
                companyUrl: 'https://techcorp.com'
            }
        },
        address: '123 Main St',
        summary: 'Great position',
        instructions: 'Be on time',
        attire: 'Business casual',
        arrival: '8:00 AM',
        start: '9:00 AM',
        end: '3:00 PM',
        contact_name: 'John Doe',
        contact_email: 'john@test.com'
    };

    describe('Lottery Result Loading (Event-Specific)', () => {
        it('should load lottery result from LotteryResults table for active event', async () => {
            const { load } = await import('../src/routes/dashboard/student/+page.server');
            
            mockPrisma.student.findFirst.mockResolvedValue(mockStudent);
            mockPrisma.event.findFirst.mockResolvedValue(mockActiveEvent);
            mockPrisma.positionsOnStudents.findMany.mockResolvedValue([]);
            
            const mockLotteryJob = {
                id: 'lottery-job-1',
                eventId: 'event-1',
                status: 'COMPLETED',
                completedAt: new Date()
            };
            
            const mockLotteryResult = {
                id: 'result-1',
                studentId: 'student-1',
                positionId: 'position-1',
                lotteryJobId: 'lottery-job-1',
                lotteryJob: mockLotteryJob
            };
            
            mockPrisma.lotteryJob.findFirst.mockResolvedValue(mockLotteryJob);
            mockPrisma.lotteryResults.findFirst.mockResolvedValue(mockLotteryResult);
            mockPrisma.position.findUnique.mockResolvedValue(mockPosition);

            const event = createMockEvent({
                user: { id: 'user-1', emailVerified: true }
            });

            const result = await load(event);

            expect(result.lotteryResult).toEqual(mockPosition);
            expect(mockPrisma.lotteryJob.findFirst).toHaveBeenCalledWith({
                where: { eventId: 'event-1' },
                orderBy: { completedAt: 'desc' }
            });
            expect(mockPrisma.lotteryResults.findFirst).toHaveBeenCalledWith({
                where: {
                    studentId: 'student-1',
                    lotteryJobId: 'lottery-job-1'
                },
                include: {
                    lotteryJob: true
                }
            });
        });

        it('should return null when no lottery job exists for active event', async () => {
            const { load } = await import('../src/routes/dashboard/student/+page.server');
            
            mockPrisma.student.findFirst.mockResolvedValue(mockStudent);
            mockPrisma.event.findFirst.mockResolvedValue(mockActiveEvent);
            mockPrisma.positionsOnStudents.findMany.mockResolvedValue([]);
            mockPrisma.lotteryJob.findFirst.mockResolvedValue(null);

            const event = createMockEvent({
                user: { id: 'user-1', emailVerified: true }
            });

            const result = await load(event);

            expect(result.lotteryResult).toBeNull();
            expect(mockPrisma.lotteryResults.findFirst).not.toHaveBeenCalled();
        });

        it('should return null when student has no result in lottery job', async () => {
            const { load } = await import('../src/routes/dashboard/student/+page.server');
            
            mockPrisma.student.findFirst.mockResolvedValue(mockStudent);
            mockPrisma.event.findFirst.mockResolvedValue(mockActiveEvent);
            mockPrisma.positionsOnStudents.findMany.mockResolvedValue([]);
            
            const mockLotteryJob = {
                id: 'lottery-job-1',
                eventId: 'event-1',
                status: 'COMPLETED',
                completedAt: new Date()
            };
            
            mockPrisma.lotteryJob.findFirst.mockResolvedValue(mockLotteryJob);
            mockPrisma.lotteryResults.findFirst.mockResolvedValue(null);

            const event = createMockEvent({
                user: { id: 'user-1', emailVerified: true }
            });

            const result = await load(event);

            expect(result.lotteryResult).toBeNull();
            expect(mockPrisma.position.findUnique).not.toHaveBeenCalled();
        });

        it('should not load lottery results when lotteryPublished is false', async () => {
            const { load } = await import('../src/routes/dashboard/student/+page.server');
            
            mockPrisma.student.findFirst.mockResolvedValue(mockStudent);
            mockPrisma.event.findFirst.mockResolvedValue({
                ...mockActiveEvent,
                lotteryPublished: false
            });
            mockPrisma.positionsOnStudents.findMany.mockResolvedValue([]);

            const event = createMockEvent({
                user: { id: 'user-1', emailVerified: true }
            });

            const result = await load(event);

            expect(result.lotteryResult).toBeNull();
            expect(result.showLotteryResult).toBe(false);
            expect(mockPrisma.lotteryJob.findFirst).not.toHaveBeenCalled();
        });

        it('should not load lottery results when event is inactive', async () => {
            const { load } = await import('../src/routes/dashboard/student/+page.server');
            
            mockPrisma.student.findFirst.mockResolvedValue(mockStudent);
            mockPrisma.event.findFirst.mockResolvedValue({
                ...mockActiveEvent,
                isActive: false
            });
            mockPrisma.positionsOnStudents.findMany.mockResolvedValue([]);

            const event = createMockEvent({
                user: { id: 'user-1', emailVerified: true }
            });

            const result = await load(event);

            expect(result.lotteryResult).toBeNull();
            expect(result.showLotteryResult).toBe(false);
            expect(mockPrisma.lotteryJob.findFirst).not.toHaveBeenCalled();
        });

        it('should load most recent lottery job when multiple exist', async () => {
            const { load } = await import('../src/routes/dashboard/student/+page.server');
            
            mockPrisma.student.findFirst.mockResolvedValue(mockStudent);
            mockPrisma.event.findFirst.mockResolvedValue(mockActiveEvent);
            mockPrisma.positionsOnStudents.findMany.mockResolvedValue([]);
            
            const newerJob = {
                id: 'lottery-job-2',
                eventId: 'event-1',
                status: 'COMPLETED',
                completedAt: new Date('2025-03-01')
            };
            
            mockPrisma.lotteryJob.findFirst.mockResolvedValue(newerJob);
            mockPrisma.lotteryResults.findFirst.mockResolvedValue({
                id: 'result-2',
                studentId: 'student-1',
                positionId: 'position-1',
                lotteryJobId: 'lottery-job-2',
                lotteryJob: newerJob
            });
            mockPrisma.position.findUnique.mockResolvedValue(mockPosition);

            const event = createMockEvent({
                user: { id: 'user-1', emailVerified: true }
            });

            const result = await load(event);

            expect(mockPrisma.lotteryJob.findFirst).toHaveBeenCalledWith({
                where: { eventId: 'event-1' },
                orderBy: { completedAt: 'desc' }
            });
            expect(result.lotteryResult).toEqual(mockPosition);
        });
    });

    describe('Position Selections Loading', () => {
        it('should load student position selections when studentSignupsEnabled is true', async () => {
            const { load } = await import('../src/routes/dashboard/student/+page.server');
            
            const mockPositions = [{
                positionId: 'pos-1',
                studentId: 'student-1',
                rank: 0,
                position: mockPosition
            }];
            
            mockPrisma.student.findFirst.mockResolvedValue(mockStudent);
            mockPrisma.event.findFirst.mockResolvedValue({
                ...mockActiveEvent,
                lotteryPublished: false
            });
            mockPrisma.positionsOnStudents.findMany.mockResolvedValue(mockPositions);
            mockPrisma.lotteryJob.findFirst.mockResolvedValue(null);

            const event = createMockEvent({
                user: { id: 'user-1', emailVerified: true }
            });

            const result = await load(event);

            expect(result.positions).toHaveLength(1);
            expect(result.positions[0]).toEqual(mockPosition);
            expect(mockPrisma.positionsOnStudents.findMany).toHaveBeenCalledWith({
                where: { 
                    studentId: 'student-1',
                    position: {
                        eventId: 'event-1'
                    }
                },
                orderBy: { rank: 'asc' },
                include: expect.objectContaining({
                    position: expect.any(Object)
                })
            });
        });

        it('should return empty positions array when student has no selections', async () => {
            const { load } = await import('../src/routes/dashboard/student/+page.server');
            
            mockPrisma.student.findFirst.mockResolvedValue(mockStudent);
            mockPrisma.event.findFirst.mockResolvedValue(mockActiveEvent);
            mockPrisma.positionsOnStudents.findMany.mockResolvedValue([]);
            mockPrisma.lotteryJob.findFirst.mockResolvedValue(null);

            const event = createMockEvent({
                user: { id: 'user-1', emailVerified: true }
            });

            const result = await load(event);

            expect(result.positions).toEqual([]);
        });
    });

    describe('Event Controls Integration', () => {
        it('should pass event control flags correctly', async () => {
            const { load } = await import('../src/routes/dashboard/student/+page.server');
            
            mockPrisma.student.findFirst.mockResolvedValue(mockStudent);
            mockPrisma.event.findFirst.mockResolvedValue(mockActiveEvent);
            mockPrisma.positionsOnStudents.findMany.mockResolvedValue([]);
            mockPrisma.lotteryJob.findFirst.mockResolvedValue(null);

            const event = createMockEvent({
                user: { id: 'user-1', emailVerified: true }
            });

            const result = await load(event);

            expect(result.studentAccountsEnabled).toBe(true);
            expect(result.studentSignupsEnabled).toBe(true);
            expect(result.lotteryPublished).toBe(true);
            expect(result.showLotteryResult).toBe(true);
        });

        it('should set showLotteryResult to false when event is inactive', async () => {
            const { load } = await import('../src/routes/dashboard/student/+page.server');
            
            mockPrisma.student.findFirst.mockResolvedValue(mockStudent);
            mockPrisma.event.findFirst.mockResolvedValue({
                ...mockActiveEvent,
                isActive: false
            });
            mockPrisma.positionsOnStudents.findMany.mockResolvedValue([]);

            const event = createMockEvent({
                user: { id: 'user-1', emailVerified: true }
            });

            const result = await load(event);

            expect(result.showLotteryResult).toBe(false);
            expect(result.lotteryResult).toBeNull();
        });
    });

    describe('Authentication and Authorization', () => {
        it('should redirect to login when user is not authenticated', async () => {
            const { load } = await import('../src/routes/dashboard/student/+page.server');
            
            const event = createMockEvent({
                user: null
            });

            await expect(load(event)).rejects.toMatchObject({
                status: 302,
                location: '/login'
            });
        });

        it('should redirect to verify-email when email is not verified', async () => {
            const { load } = await import('../src/routes/dashboard/student/+page.server');
            
            const event = createMockEvent({
                user: { id: 'user-1', emailVerified: false }
            });

            await expect(load(event)).rejects.toMatchObject({
                status: 302,
                location: '/verify-email'
            });
        });

        it('should redirect to dashboard when student record not found', async () => {
            const { load } = await import('../src/routes/dashboard/student/+page.server');
            
            mockPrisma.student.findFirst.mockResolvedValue(null);

            const event = createMockEvent({
                user: { id: 'user-1', emailVerified: true }
            });

            await expect(load(event)).rejects.toMatchObject({
                status: 302,
                location: '/dashboard'
            });
        });
    });

    describe('No Active Event Scenarios', () => {
        it('should handle no active event gracefully', async () => {
            const { load } = await import('../src/routes/dashboard/student/+page.server');
            
            mockPrisma.student.findFirst.mockResolvedValue(mockStudent);
            mockPrisma.event.findFirst.mockResolvedValue(null);
            mockPrisma.positionsOnStudents.findMany.mockResolvedValue([]);

            const event = createMockEvent({
                user: { id: 'user-1', emailVerified: true }
            });

            const result = await load(event);

            expect(result.studentAccountsEnabled).toBe(false);
            expect(result.studentSignupsEnabled).toBe(false);
            expect(result.lotteryPublished).toBe(false);
            expect(result.showLotteryResult).toBe(false);
            expect(result.lotteryResult).toBeNull();
        });
    });
});
