import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '$lib/server/prisma';
import { 
    trackStudentParticipation, 
    getEventIdForPosition, 
    getActiveEventIdForSchool 
} from '$lib/server/studentParticipation';

vi.mock('$lib/server/prisma', () => ({
    prisma: {
        studentEventParticipation: {
            findUnique: vi.fn(),
            create: vi.fn(),
        },
        position: {
            findUnique: vi.fn(),
        },
        event: {
            findFirst: vi.fn(),
        },
    },
}));

describe('Student Event Participation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('trackStudentParticipation', () => {
        it('should create participation record when none exists', async () => {
            const studentId = 'student-1';
            const eventId = 'event-1';
            const participatedAt = new Date('2025-01-15T10:00:00Z');

            vi.mocked(prisma.studentEventParticipation.findUnique).mockResolvedValue(null);
            vi.mocked(prisma.studentEventParticipation.create).mockResolvedValue({
                id: 'participation-1',
                studentId,
                eventId,
                participatedAt,
                createdAt: participatedAt
            });

            await trackStudentParticipation(studentId, eventId, participatedAt);

            expect(prisma.studentEventParticipation.findUnique).toHaveBeenCalledWith({
                where: {
                    studentId_eventId: {
                        studentId,
                        eventId
                    }
                }
            });

            expect(prisma.studentEventParticipation.create).toHaveBeenCalledWith({
                data: {
                    studentId,
                    eventId,
                    participatedAt,
                    createdAt: participatedAt
                }
            });
        });

        it('should not create participation record when one already exists', async () => {
            const studentId = 'student-1';
            const eventId = 'event-1';
            const existingParticipation = {
                id: 'participation-1',
                studentId,
                eventId,
                participatedAt: new Date('2025-01-10T10:00:00Z'),
                createdAt: new Date('2025-01-10T10:00:00Z')
            };

            vi.mocked(prisma.studentEventParticipation.findUnique).mockResolvedValue(existingParticipation);

            await trackStudentParticipation(studentId, eventId);

            expect(prisma.studentEventParticipation.findUnique).toHaveBeenCalledWith({
                where: {
                    studentId_eventId: {
                        studentId,
                        eventId
                    }
                }
            });

            expect(prisma.studentEventParticipation.create).not.toHaveBeenCalled();
        });

        it('should use current date when participatedAt is not provided', async () => {
            const studentId = 'student-1';
            const eventId = 'event-1';
            const mockDate = new Date('2025-01-15T10:00:00Z');

            vi.mocked(prisma.studentEventParticipation.findUnique).mockResolvedValue(null);
            vi.mocked(prisma.studentEventParticipation.create).mockResolvedValue({
                id: 'participation-1',
                studentId,
                eventId,
                participatedAt: mockDate,
                createdAt: mockDate
            });

            // Mock Date.now() to return a consistent value
            const originalDate = global.Date;
            global.Date = vi.fn(() => mockDate) as unknown as typeof Date;
            global.Date.now = vi.fn(() => mockDate.getTime());

            await trackStudentParticipation(studentId, eventId);

            expect(prisma.studentEventParticipation.create).toHaveBeenCalledWith({
                data: {
                    studentId,
                    eventId,
                    participatedAt: mockDate,
                    createdAt: mockDate
                }
            });

            // Restore original Date
            global.Date = originalDate;
        });

        it('should handle errors gracefully without throwing', async () => {
            const studentId = 'student-1';
            const eventId = 'event-1';

            vi.mocked(prisma.studentEventParticipation.findUnique).mockRejectedValue(new Error('Database error'));

            // Should not throw
            await expect(trackStudentParticipation(studentId, eventId)).resolves.toBeUndefined();
        });
    });

    describe('getEventIdForPosition', () => {
        it('should return event ID for valid position', async () => {
            const positionId = 'position-1';
            const eventId = 'event-1';

            vi.mocked(prisma.position.findUnique).mockResolvedValue({
                eventId
            } as { eventId: string });

            const result = await getEventIdForPosition(positionId);

            expect(prisma.position.findUnique).toHaveBeenCalledWith({
                where: { id: positionId },
                select: { eventId: true }
            });
            expect(result).toBe(eventId);
        });

        it('should return null for non-existent position', async () => {
            const positionId = 'non-existent';

            vi.mocked(prisma.position.findUnique).mockResolvedValue(null);

            const result = await getEventIdForPosition(positionId);

            expect(result).toBeNull();
        });

        it('should handle errors gracefully', async () => {
            const positionId = 'position-1';

            vi.mocked(prisma.position.findUnique).mockRejectedValue(new Error('Database error'));

            const result = await getEventIdForPosition(positionId);

            expect(result).toBeNull();
        });
    });

    describe('getActiveEventIdForSchool', () => {
        it('should return active event ID for school', async () => {
            const schoolId = 'school-1';
            const eventId = 'event-1';

            vi.mocked(prisma.event.findFirst).mockResolvedValue({
                id: eventId
            } as { id: string });

            const result = await getActiveEventIdForSchool(schoolId);

            expect(prisma.event.findFirst).toHaveBeenCalledWith({
                where: {
                    schoolId,
                    isActive: true
                },
                select: { id: true }
            });
            expect(result).toBe(eventId);
        });

        it('should return null when no active event exists', async () => {
            const schoolId = 'school-1';

            vi.mocked(prisma.event.findFirst).mockResolvedValue(null);

            const result = await getActiveEventIdForSchool(schoolId);

            expect(result).toBeNull();
        });

        it('should handle errors gracefully', async () => {
            const schoolId = 'school-1';

            vi.mocked(prisma.event.findFirst).mockRejectedValue(new Error('Database error'));

            const result = await getActiveEventIdForSchool(schoolId);

            expect(result).toBeNull();
        });
    });

    describe('Integration Scenarios', () => {
        it('should handle complete student participation flow', async () => {
            const studentId = 'student-1';
            const schoolId = 'school-1';
            const eventId = 'event-1';
            const positionId = 'position-1';

            // Mock the flow: get active event, get position event, track participation
            vi.mocked(prisma.event.findFirst).mockResolvedValue({ id: eventId } as { id: string });
            vi.mocked(prisma.position.findUnique).mockResolvedValue({ eventId } as { eventId: string });
            vi.mocked(prisma.studentEventParticipation.findUnique).mockResolvedValue(null);
            vi.mocked(prisma.studentEventParticipation.create).mockResolvedValue({
                id: 'participation-1',
                studentId,
                eventId,
                participatedAt: expect.any(Date),
                createdAt: expect.any(Date)
            });

            // Simulate the flow that would happen in the student dashboard
            const activeEventId = await getActiveEventIdForSchool(schoolId);
            expect(activeEventId).toBe(eventId);

            const positionEventId = await getEventIdForPosition(positionId);
            expect(positionEventId).toBe(eventId);

            await trackStudentParticipation(studentId, activeEventId!);

            expect(prisma.studentEventParticipation.create).toHaveBeenCalledWith({
                data: {
                    studentId,
                    eventId: activeEventId,
                    participatedAt: expect.any(Date),
                    createdAt: expect.any(Date)
                }
            });
        });

        it('should handle duplicate participation tracking gracefully', async () => {
            const studentId = 'student-1';
            const eventId = 'event-1';
            const existingParticipation = {
                id: 'participation-1',
                studentId,
                eventId,
                participatedAt: new Date('2025-01-10T10:00:00Z'),
                createdAt: new Date('2025-01-10T10:00:00Z')
            };

            vi.mocked(prisma.studentEventParticipation.findUnique).mockResolvedValue(existingParticipation);

            // Should not create duplicate
            await trackStudentParticipation(studentId, eventId);

            expect(prisma.studentEventParticipation.create).not.toHaveBeenCalled();
        });
    });
});
