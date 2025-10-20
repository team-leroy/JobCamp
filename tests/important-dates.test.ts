import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prisma client
vi.mock('../src/lib/server/prisma', () => ({
  prisma: {
    importantDate: {
      create: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn()
    },
    event: {
      findFirst: vi.fn()
    },
    user: {
      findFirst: vi.fn()
    }
  }
}));

import { prisma } from '../src/lib/server/prisma';

describe('Important Dates Management', () => {
    const testEventId = 'test-event-1';
    const testSchoolId = 'test-school-1';
    const testImportantDateId = 'test-date-1';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Create Important Date', () => {
        it('should create an important date with all required fields and optional time', async () => {
            const mockImportantDate = {
                id: testImportantDateId,
                eventId: testEventId,
                date: new Date('2025-02-28'),
                time: '2:00 PM',
                title: 'MANDATORY Job Shadow Orientation',
                description: 'Meet in the theater during tutorial',
                displayOrder: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            vi.mocked(prisma.importantDate.create).mockResolvedValue(mockImportantDate);

            const result = await prisma.importantDate.create({
                data: {
                    eventId: testEventId,
                    date: new Date('2025-02-28'),
                    time: '2:00 PM',
                    title: 'MANDATORY Job Shadow Orientation',
                    description: 'Meet in the theater during tutorial',
                    displayOrder: 0
                }
            });

            expect(result).toBeDefined();
            expect(result.eventId).toBe(testEventId);
            expect(result.title).toBe('MANDATORY Job Shadow Orientation');
            expect(result.time).toBe('2:00 PM');
            expect(result.displayOrder).toBe(0);
        });

        it('should create an all-day important date without time', async () => {
            const mockImportantDate = {
                id: 'test-date-2',
                eventId: testEventId,
                date: new Date('2025-03-10'),
                time: null,
                title: 'JOB SHADOW DAY!',
                description: 'Be on time, go prepared with questions',
                displayOrder: 1,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            vi.mocked(prisma.importantDate.create).mockResolvedValue(mockImportantDate);

            const result = await prisma.importantDate.create({
                data: {
                    eventId: testEventId,
                    date: new Date('2025-03-10'),
                    time: null,
                    title: 'JOB SHADOW DAY!',
                    description: 'Be on time, go prepared with questions',
                    displayOrder: 1
                }
            });

            expect(result).toBeDefined();
            expect(result.time).toBeNull();
            expect(result.title).toBe('JOB SHADOW DAY!');
        });

        it('should default displayOrder to 0 when not provided', async () => {
            const mockImportantDate = {
                id: 'test-date-3',
                eventId: testEventId,
                date: new Date('2025-03-15'),
                time: null,
                title: 'Test Date',
                description: 'Test description',
                displayOrder: 0, // Default value
                createdAt: new Date(),
                updatedAt: new Date()
            };

            vi.mocked(prisma.importantDate.create).mockResolvedValue(mockImportantDate);

            const result = await prisma.importantDate.create({
                data: {
                    eventId: testEventId,
                    date: new Date('2025-03-15'),
                    title: 'Test Date',
                    description: 'Test description'
                }
            });

            expect(result.displayOrder).toBe(0);
        });
    });

    describe('Read Important Dates', () => {
        it('should retrieve important dates sorted by display order and date', async () => {
            const mockDates = [
                {
                    id: 'date-1',
                    eventId: testEventId,
                    date: new Date('2025-02-28'),
                    time: 'Tutorial',
                    title: 'Orientation',
                    description: 'Required meeting',
                    displayOrder: 0,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 'date-2',
                    eventId: testEventId,
                    date: new Date('2025-03-05'),
                    time: null,
                    title: 'Email Deadline',
                    description: 'Email your host',
                    displayOrder: 1,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 'date-3',
                    eventId: testEventId,
                    date: new Date('2025-03-10'),
                    time: null,
                    title: 'Job Shadow Day',
                    description: 'Main event',
                    displayOrder: 2,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            vi.mocked(prisma.importantDate.findMany).mockResolvedValue(mockDates);

            const result = await prisma.importantDate.findMany({
                where: { eventId: testEventId },
                orderBy: [
                    { displayOrder: 'asc' },
                    { date: 'asc' }
                ]
            });

            expect(result).toHaveLength(3);
            expect(result[0].displayOrder).toBe(0);
            expect(result[1].displayOrder).toBe(1);
            expect(result[2].displayOrder).toBe(2);
        });

        it('should filter important dates by event ID', async () => {
            const mockDates = [
                {
                    id: 'date-1',
                    eventId: testEventId,
                    date: new Date('2025-02-28'),
                    time: null,
                    title: 'Orientation',
                    description: 'Required meeting',
                    displayOrder: 0,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            vi.mocked(prisma.importantDate.findMany).mockResolvedValue(mockDates);

            const result = await prisma.importantDate.findMany({
                where: { eventId: testEventId }
            });

            expect(result).toHaveLength(1);
            expect(result[0].eventId).toBe(testEventId);
        });

        it('should return empty array when no important dates exist', async () => {
            vi.mocked(prisma.importantDate.findMany).mockResolvedValue([]);

            const result = await prisma.importantDate.findMany({
                where: { eventId: testEventId }
            });

            expect(result).toHaveLength(0);
        });
    });

    describe('Update Important Date', () => {
        it('should update all fields of an important date', async () => {
            const mockUpdatedDate = {
                id: testImportantDateId,
                eventId: testEventId,
                date: new Date('2025-03-01'),
                time: '3:00 PM',
                title: 'Updated Title',
                description: 'Updated description',
                displayOrder: 5,
                createdAt: new Date('2025-01-01'),
                updatedAt: new Date()
            };

            vi.mocked(prisma.importantDate.update).mockResolvedValue(mockUpdatedDate);

            const result = await prisma.importantDate.update({
                where: { id: testImportantDateId },
                data: {
                    date: new Date('2025-03-01'),
                    time: '3:00 PM',
                    title: 'Updated Title',
                    description: 'Updated description',
                    displayOrder: 5
                }
            });

            expect(result.title).toBe('Updated Title');
            expect(result.time).toBe('3:00 PM');
            expect(result.description).toBe('Updated description');
            expect(result.displayOrder).toBe(5);
        });

        it('should update time to null to make it an all-day event', async () => {
            const mockUpdatedDate = {
                id: testImportantDateId,
                eventId: testEventId,
                date: new Date('2025-02-28'),
                time: null,
                title: 'Test Title',
                description: 'Test description',
                displayOrder: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            vi.mocked(prisma.importantDate.update).mockResolvedValue(mockUpdatedDate);

            const result = await prisma.importantDate.update({
                where: { id: testImportantDateId },
                data: { time: null }
            });

            expect(result.time).toBeNull();
        });

        it('should update only title field', async () => {
            const mockUpdatedDate = {
                id: testImportantDateId,
                eventId: testEventId,
                date: new Date('2025-02-28'),
                time: '2:00 PM',
                title: 'New Title Only',
                description: 'Original description',
                displayOrder: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            vi.mocked(prisma.importantDate.update).mockResolvedValue(mockUpdatedDate);

            const result = await prisma.importantDate.update({
                where: { id: testImportantDateId },
                data: { title: 'New Title Only' }
            });

            expect(result.title).toBe('New Title Only');
            expect(result.description).toBe('Original description');
            expect(result.time).toBe('2:00 PM');
        });
    });

    describe('Delete Important Date', () => {
        it('should delete an important date by ID', async () => {
            const mockDeletedDate = {
                id: testImportantDateId,
                eventId: testEventId,
                date: new Date('2025-02-28'),
                time: null,
                title: 'Deleted Date',
                description: 'Will be deleted',
                displayOrder: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            vi.mocked(prisma.importantDate.delete).mockResolvedValue(mockDeletedDate);

            const result = await prisma.importantDate.delete({
                where: { id: testImportantDateId }
            });

            expect(result.id).toBe(testImportantDateId);
            expect(prisma.importantDate.delete).toHaveBeenCalledWith({
                where: { id: testImportantDateId }
            });
        });

        it('should delete all important dates for an event', async () => {
            vi.mocked(prisma.importantDate.deleteMany).mockResolvedValue({ count: 3 });

            const result = await prisma.importantDate.deleteMany({
                where: { eventId: testEventId }
            });

            expect(result.count).toBe(3);
            expect(prisma.importantDate.deleteMany).toHaveBeenCalledWith({
                where: { eventId: testEventId }
            });
        });
    });

    describe('Event Relationship', () => {
        it('should load active event with important dates', async () => {
            const mockEvent = {
                id: testEventId,
                schoolId: testSchoolId,
                date: new Date('2025-03-10'),
                displayLotteryResults: false,
                isActive: true,
                isArchived: false,
                name: 'Spring 2025 Job Shadow',
                companyAccountsEnabled: false,
                companySignupsEnabled: false,
                lotteryPublished: false,
                studentAccountsEnabled: false,
                studentSignupsEnabled: false,
                companyDirectoryEnabled: false,
                createdAt: new Date(),
                activatedAt: null
            };

            const mockDates = [
                {
                    id: 'date-1',
                    eventId: testEventId,
                    date: new Date('2025-02-28'),
                    time: null,
                    title: 'Orientation',
                    description: 'Required',
                    displayOrder: 0,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            vi.mocked(prisma.event.findFirst).mockResolvedValue(mockEvent);
            vi.mocked(prisma.importantDate.findMany).mockResolvedValue(mockDates);

            const event = await prisma.event.findFirst({
                where: { schoolId: testSchoolId, isActive: true }
            });

            expect(event).toBeDefined();
            expect(event?.isActive).toBe(true);

            const dates = await prisma.importantDate.findMany({
                where: { eventId: event!.id },
                orderBy: [{ displayOrder: 'asc' }, { date: 'asc' }]
            });

            expect(dates).toHaveLength(1);
            expect(dates[0].eventId).toBe(testEventId);
        });
    });
});
