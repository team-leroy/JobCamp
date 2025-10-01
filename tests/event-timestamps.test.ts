import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '$lib/server/prisma';
import { createEvent, activateEvent, getActiveEvent, getSchoolEvents } from '$lib/server/eventManagement';

// Mock prisma
vi.mock('$lib/server/prisma', () => ({
    prisma: {
        event: {
            create: vi.fn(),
            findFirst: vi.fn(),
            findMany: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
            updateMany: vi.fn()
        },
        position: {
            createMany: vi.fn()
        }
    }
}));

describe('Event Timestamps', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockSchoolId = 'school-1';
    const mockEventData = {
        name: 'Test Event 2025',
        date: new Date('2025-03-15'),
        displayLotteryResults: false,
        eventEnabled: false,
        companyAccountsEnabled: false,
        companySignupsEnabled: false,
        studentAccountsEnabled: false,
        studentSignupsEnabled: false,
        lotteryPublished: false,
        companyDirectoryEnabled: false
    };

    describe('createEvent', () => {
        it('should set createdAt when creating a new event', async () => {
            const mockCreatedEvent = {
                id: 'event-1',
                name: 'Test Event 2025',
                date: new Date('2025-03-15'),
                isActive: false,
                isArchived: false,
                displayLotteryResults: false,
                schoolId: mockSchoolId,
                createdAt: new Date('2025-01-01T10:00:00Z'),
                activatedAt: null,
                eventEnabled: false,
                companyAccountsEnabled: false,
                companySignupsEnabled: false,
                studentAccountsEnabled: false,
                studentSignupsEnabled: false,
                lotteryPublished: false,
                companyDirectoryEnabled: false,
                positions: []
            };

            vi.mocked(prisma.event.create).mockResolvedValue(mockCreatedEvent);
            vi.mocked(prisma.event.findFirst).mockResolvedValue(null); // No previous event
            vi.mocked(prisma.event.findUnique).mockResolvedValue(mockCreatedEvent);

            const result = await createEvent(mockSchoolId, mockEventData);

            expect(prisma.event.create).toHaveBeenCalledWith({
                data: {
                    schoolId: mockSchoolId,
                    name: mockEventData.name,
                    date: mockEventData.date,
                    displayLotteryResults: mockEventData.displayLotteryResults,
                    isActive: false,
                    isArchived: false,
                    eventEnabled: mockEventData.eventEnabled,
                    companyAccountsEnabled: mockEventData.companyAccountsEnabled,
                    companySignupsEnabled: mockEventData.companySignupsEnabled,
                    studentAccountsEnabled: mockEventData.studentAccountsEnabled,
                    studentSignupsEnabled: mockEventData.studentSignupsEnabled,
                    lotteryPublished: mockEventData.lotteryPublished,
                    companyDirectoryEnabled: mockEventData.companyDirectoryEnabled
                }
            });

            expect(result.createdAt).toEqual(mockCreatedEvent.createdAt);
            expect(result.activatedAt).toBeNull();
        });

        it('should include createdAt and activatedAt in returned EventWithStats', async () => {
            const mockCreatedEvent = {
                id: 'event-1',
                name: 'Test Event 2025',
                date: new Date('2025-03-15'),
                isActive: false,
                isArchived: false,
                displayLotteryResults: false,
                schoolId: mockSchoolId,
                createdAt: new Date('2025-01-01T10:00:00Z'),
                activatedAt: null,
                eventEnabled: false,
                companyAccountsEnabled: false,
                companySignupsEnabled: false,
                studentAccountsEnabled: false,
                studentSignupsEnabled: false,
                lotteryPublished: false,
                companyDirectoryEnabled: false,
                positions: []
            };

            vi.mocked(prisma.event.create).mockResolvedValue(mockCreatedEvent);
            vi.mocked(prisma.event.findFirst).mockResolvedValue(null);
            vi.mocked(prisma.event.findUnique).mockResolvedValue(mockCreatedEvent);

            const result = await createEvent(mockSchoolId, mockEventData);

            expect(result).toHaveProperty('createdAt');
            expect(result).toHaveProperty('activatedAt');
            expect(result.createdAt).toBeInstanceOf(Date);
            expect(result.activatedAt).toBeNull();
        });
    });

    describe('activateEvent', () => {
        it('should set activatedAt when activating an event', async () => {
            const activationTime = new Date('2025-01-15T14:30:00Z');
            const mockActivatedEvent = {
                id: 'event-1',
                name: 'Test Event 2025',
                date: new Date('2025-03-15'),
                isActive: true,
                isArchived: false,
                displayLotteryResults: false,
                schoolId: mockSchoolId,
                createdAt: new Date('2025-01-01T10:00:00Z'),
                activatedAt: activationTime,
                eventEnabled: false,
                companyAccountsEnabled: false,
                companySignupsEnabled: false,
                studentAccountsEnabled: false,
                studentSignupsEnabled: false,
                lotteryPublished: false,
                companyDirectoryEnabled: false,
                positions: []
            };

            vi.mocked(prisma.event.updateMany).mockResolvedValue({ count: 0 });
            vi.mocked(prisma.event.update).mockResolvedValue(mockActivatedEvent);

            const result = await activateEvent('event-1', mockSchoolId);

            expect(prisma.event.update).toHaveBeenCalledWith({
                where: { id: 'event-1' },
                data: { 
                    isActive: true,
                    activatedAt: expect.any(Date)
                },
                include: expect.any(Object)
            });

            expect(result.activatedAt).toEqual(activationTime);
            expect(result.isActive).toBe(true);
        });

        it('should deactivate other events before activating the new one', async () => {
            const mockActivatedEvent = {
                id: 'event-1',
                name: 'Test Event 2025',
                date: new Date('2025-03-15'),
                isActive: true,
                isArchived: false,
                displayLotteryResults: false,
                schoolId: mockSchoolId,
                createdAt: new Date('2025-01-01T10:00:00Z'),
                activatedAt: new Date('2025-01-15T14:30:00Z'),
                eventEnabled: false,
                companyAccountsEnabled: false,
                companySignupsEnabled: false,
                studentAccountsEnabled: false,
                studentSignupsEnabled: false,
                lotteryPublished: false,
                companyDirectoryEnabled: false,
                positions: []
            };

            vi.mocked(prisma.event.updateMany).mockResolvedValue({ count: 1 });
            vi.mocked(prisma.event.update).mockResolvedValue(mockActivatedEvent);

            await activateEvent('event-1', mockSchoolId);

            expect(prisma.event.updateMany).toHaveBeenCalledWith({
                where: {
                    schoolId: mockSchoolId,
                    isActive: true
                },
                data: {
                    isActive: false
                }
            });
        });
    });

    describe('getActiveEvent', () => {
        it('should return event with createdAt and activatedAt fields', async () => {
            const mockActiveEvent = {
                id: 'event-1',
                name: 'Active Event 2025',
                date: new Date('2025-03-15'),
                isActive: true,
                isArchived: false,
                displayLotteryResults: false,
                schoolId: mockSchoolId,
                createdAt: new Date('2025-01-01T10:00:00Z'),
                activatedAt: new Date('2025-01-15T14:30:00Z'),
                eventEnabled: true,
                companyAccountsEnabled: true,
                companySignupsEnabled: true,
                studentAccountsEnabled: true,
                studentSignupsEnabled: true,
                lotteryPublished: false,
                companyDirectoryEnabled: true,
                positions: []
            };

            vi.mocked(prisma.event.findFirst).mockResolvedValue(mockActiveEvent);

            const result = await getActiveEvent(mockSchoolId);

            expect(result).not.toBeNull();
            expect(result!.createdAt).toEqual(mockActiveEvent.createdAt);
            expect(result!.activatedAt).toEqual(mockActiveEvent.activatedAt);
        });

        it('should return null when no active event exists', async () => {
            vi.mocked(prisma.event.findFirst).mockResolvedValue(null);

            const result = await getActiveEvent(mockSchoolId);

            expect(result).toBeNull();
        });
    });

    describe('getSchoolEvents', () => {
        it('should include createdAt and activatedAt in all returned events', async () => {
            const mockEvents = [
                {
                    id: 'event-1',
                    name: 'Event 1',
                    date: new Date('2025-03-15'),
                    isActive: true,
                    isArchived: false,
                    displayLotteryResults: false,
                    schoolId: mockSchoolId,
                    createdAt: new Date('2025-01-01T10:00:00Z'),
                    activatedAt: new Date('2025-01-15T14:30:00Z'),
                    eventEnabled: true,
                    companyAccountsEnabled: true,
                    companySignupsEnabled: true,
                    studentAccountsEnabled: true,
                    studentSignupsEnabled: true,
                    lotteryPublished: false,
                    companyDirectoryEnabled: true,
                    positions: []
                },
                {
                    id: 'event-2',
                    name: 'Event 2',
                    date: new Date('2025-04-15'),
                    isActive: false,
                    isArchived: false,
                    displayLotteryResults: false,
                    schoolId: mockSchoolId,
                    createdAt: new Date('2025-02-01T10:00:00Z'),
                    activatedAt: null,
                    eventEnabled: false,
                    companyAccountsEnabled: false,
                    companySignupsEnabled: false,
                    studentAccountsEnabled: false,
                    studentSignupsEnabled: false,
                    lotteryPublished: false,
                    companyDirectoryEnabled: false,
                    positions: []
                }
            ];

            vi.mocked(prisma.event.findMany).mockResolvedValue(mockEvents);

            const result = await getSchoolEvents(mockSchoolId);

            expect(result).toHaveLength(2);
            expect(result[0]).toHaveProperty('createdAt');
            expect(result[0]).toHaveProperty('activatedAt');
            expect(result[1]).toHaveProperty('createdAt');
            expect(result[1]).toHaveProperty('activatedAt');
            expect(result[0].activatedAt).not.toBeNull();
            expect(result[1].activatedAt).toBeNull();
        });
    });

    describe('Event Timestamp Logic', () => {
        it('should use activatedAt when available for statistics cutoff', () => {
            const event = {
                createdAt: new Date('2025-01-01T10:00:00Z'),
                activatedAt: new Date('2025-01-15T14:30:00Z')
            };

            const eventStartDate = event.activatedAt || event.createdAt;
            expect(eventStartDate).toEqual(event.activatedAt);
        });

        it('should fall back to createdAt when activatedAt is null', () => {
            const event = {
                createdAt: new Date('2025-01-01T10:00:00Z'),
                activatedAt: null
            };

            const eventStartDate = event.activatedAt || event.createdAt;
            expect(eventStartDate).toEqual(event.createdAt);
        });

        it('should ensure activatedAt is always after createdAt', () => {
            const createdAt = new Date('2025-01-01T10:00:00Z');
            const activatedAt = new Date('2025-01-15T14:30:00Z');

            expect(activatedAt.getTime()).toBeGreaterThan(createdAt.getTime());
        });
    });
});
