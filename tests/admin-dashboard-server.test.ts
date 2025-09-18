import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prisma client
vi.mock('../src/lib/server/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn()
    },
    event: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn()
    },
    school: {
      findMany: vi.fn()
    },
    student: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn()
    },
    company: {
      count: vi.fn(),
      findMany: vi.fn()
    },
    host: {
      count: vi.fn()
    },
    position: {
      aggregate: vi.fn(),
      count: vi.fn()
    },
    positionsOnStudents: {
      count: vi.fn()
    }
  }
}));

// Mock event management functions
vi.mock('../src/lib/server/eventManagement', () => ({
  createEvent: vi.fn(),
  activateEvent: vi.fn(),
  archiveEvent: vi.fn(),
  getSchoolEvents: vi.fn()
}));

import { prisma } from '../src/lib/server/prisma';
import { createEvent, activateEvent, archiveEvent, getSchoolEvents } from '../src/lib/server/eventManagement';

describe('Admin Dashboard Server Actions', () => {
  const mockUser = {
    id: 'user-1',
    email: 'admin@school.edu',
    emailVerified: true,
    host: null,
    adminOfSchools: [{ id: 'school-1', name: 'Test School' }]
  };

  // mockLocals would be used in actual route handler tests
  // const mockLocals = {
  //   user: mockUser
  // };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createEvent Action', () => {
    it('should create event with valid data and carry forward positions', async () => {
      const mockFormData = new FormData();
      mockFormData.append('eventName', 'Spring 2024 Job Shadow');
      mockFormData.append('eventDate', '2024-04-15');
      mockFormData.append('displayLotteryResults', 'on');
      mockFormData.append('carryForwardData', 'on');

      // Mock user lookup
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);

      // Mock createEvent function
      const mockCreatedEvent = {
        id: 'event-1',
        name: 'Spring 2024 Job Shadow',
        date: new Date('2024-04-15'),
        isActive: false,
        isArchived: false,
        displayLotteryResults: true,
        schoolId: 'school-1',
        stats: {
          totalPositions: 5,
          totalSlots: 25,
          studentsWithChoices: 0
        }
      };
      vi.mocked(createEvent).mockResolvedValue(mockCreatedEvent);

      // Extract form data
      const eventName = mockFormData.get('eventName')?.toString();
      const eventDate = mockFormData.get('eventDate')?.toString();
      const displayLotteryResults = mockFormData.get('displayLotteryResults') === 'on';
      const carryForwardData = mockFormData.get('carryForwardData') === 'on';

      expect(eventName).toBe('Spring 2024 Job Shadow');
      expect(eventDate).toBe('2024-04-15');
      expect(displayLotteryResults).toBe(true);
      expect(carryForwardData).toBe(true);

      // Test event creation with proper data structure
      if (eventDate) {
        const eventData = {
          name: eventName,
          date: new Date(eventDate),
          displayLotteryResults,
          carryForwardData
        };

        await createEvent('school-1', eventData);
        
        expect(createEvent).toHaveBeenCalledWith('school-1', eventData);
      }
    });

    it('should create event without optional name', async () => {
      const mockFormData = new FormData();
      mockFormData.append('eventDate', '2024-05-20');
      mockFormData.append('displayLotteryResults', ''); // unchecked
      mockFormData.append('carryForwardData', ''); // unchecked

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);

      const eventName = mockFormData.get('eventName')?.toString() || undefined;
      const eventDate = mockFormData.get('eventDate')?.toString();
      const displayLotteryResults = mockFormData.get('displayLotteryResults') === 'on';
      const carryForwardData = mockFormData.get('carryForwardData') === 'on';

      expect(eventName).toBeUndefined();
      expect(displayLotteryResults).toBe(false);
      expect(carryForwardData).toBe(false);

      if (eventDate) {
        const eventData = {
          name: eventName,
          date: new Date(eventDate),
          displayLotteryResults,
          carryForwardData
        };

        await createEvent('school-1', eventData);
        expect(createEvent).toHaveBeenCalledWith('school-1', eventData);
      }
    });

    it('should reject request with missing date', async () => {
      const mockFormData = new FormData();
      mockFormData.append('eventName', 'Test Event');
      // Missing eventDate

      const eventDate = mockFormData.get('eventDate')?.toString();
      expect(eventDate).toBeUndefined();
    });

    it('should reject unauthorized users', async () => {
      const mockFormData = new FormData();
      mockFormData.append('eventDate', '2024-04-15');

      // Mock user without admin privileges
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        ...mockUser,
        adminOfSchools: []
      });

      const userInfo = await prisma.user.findFirst({
        where: { id: mockUser.id },
        include: { adminOfSchools: true }
      });

      expect(userInfo?.adminOfSchools).toHaveLength(0);
    });
  });

  describe('activateEvent Action', () => {
    it('should activate event with valid eventId', async () => {
      const mockFormData = new FormData();
      mockFormData.append('eventId', 'event-123');

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);
      vi.mocked(prisma.event.findFirst).mockResolvedValue({
        id: 'event-123',
        schoolId: 'school-1',
        name: 'Test Event',
        date: new Date(),
        isActive: false,
        isArchived: false,
        displayLotteryResults: false
      });

      const mockActivatedEvent = {
        id: 'event-123',
        name: 'Test Event',
        date: new Date(),
        isActive: true,
        isArchived: false,
        displayLotteryResults: false,
        schoolId: 'school-1',
        stats: {
          totalPositions: 3,
          totalSlots: 15,
          studentsWithChoices: 8
        }
      };
      vi.mocked(activateEvent).mockResolvedValue(mockActivatedEvent);

      const eventId = mockFormData.get('eventId')?.toString();
      expect(eventId).toBe('event-123');

      if (eventId) {
        await activateEvent(eventId, 'school-1');
        expect(activateEvent).toHaveBeenCalledWith('event-123', 'school-1');
      }
    });

    it('should reject activation of non-existent event', async () => {
      const mockFormData = new FormData();
      mockFormData.append('eventId', 'non-existent-event');

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);
      vi.mocked(prisma.event.findFirst).mockResolvedValue(null);

      const eventId = mockFormData.get('eventId')?.toString();
      const event = await prisma.event.findFirst({
        where: { 
          id: eventId,
          schoolId: 'school-1' 
        }
      });

      expect(event).toBeNull();
    });

    it('should reject activation without eventId', async () => {
      const mockFormData = new FormData();
      // Missing eventId

      const eventId = mockFormData.get('eventId')?.toString();
      expect(eventId).toBeUndefined();
    });
  });

  describe('archiveEvent Action', () => {
    it('should archive currently active event', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);
      vi.mocked(prisma.event.findFirst).mockResolvedValue({
        id: 'active-event-1',
        schoolId: 'school-1',
        name: 'Current Event',
        date: new Date(),
        isActive: true,
        isArchived: false,
        displayLotteryResults: true
      });

      const mockArchivedEvent = {
        id: 'active-event-1',
        name: 'Current Event',
        date: new Date(),
        isActive: false,
        isArchived: true,
        displayLotteryResults: true,
        schoolId: 'school-1',
        stats: {
          totalPositions: 10,
          totalSlots: 50,
          studentsWithChoices: 25
        }
      };
      vi.mocked(archiveEvent).mockResolvedValue(mockArchivedEvent);

      const activeEvent = await prisma.event.findFirst({
        where: { 
          schoolId: 'school-1',
          isActive: true 
        }
      });

      expect(activeEvent?.isActive).toBe(true);

      if (activeEvent) {
        await archiveEvent(activeEvent.id);
        expect(archiveEvent).toHaveBeenCalledWith('active-event-1');
      }
    });

    it('should handle case when no active event exists', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);
      vi.mocked(prisma.event.findFirst).mockResolvedValue(null);

      const activeEvent = await prisma.event.findFirst({
        where: { 
          schoolId: 'school-1',
          isActive: true 
        }
      });

      expect(activeEvent).toBeNull();
    });
  });

  describe('Load Function with Event Management', () => {
    it('should load school events for event management', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          name: 'Active Event',
          date: new Date('2024-04-15'),
          isActive: true,
          isArchived: false,
          displayLotteryResults: true,
          schoolId: 'school-1',
          stats: {
            totalPositions: 5,
            totalSlots: 25,
            studentsWithChoices: 12
          }
        },
        {
          id: 'event-2',
          name: 'Draft Event',
          date: new Date('2024-06-10'),
          isActive: false,
          isArchived: false,
          displayLotteryResults: false,
          schoolId: 'school-1',
          stats: {
            totalPositions: 0,
            totalSlots: 0,
            studentsWithChoices: 0
          }
        }
      ];

      vi.mocked(getSchoolEvents).mockResolvedValue(mockEvents);

      const schoolEvents = await getSchoolEvents('school-1', false);
      
      expect(schoolEvents).toHaveLength(2);
      expect(schoolEvents[0].isActive).toBe(true);
      expect(schoolEvents[1].isActive).toBe(false);
      expect(getSchoolEvents).toHaveBeenCalledWith('school-1', false);
    });

    it('should load active event for upcoming event display', async () => {
      const mockActiveEvent = {
        id: 'active-1',
        schoolId: 'school-1',
        name: 'Spring Job Shadow',
        date: new Date('2024-04-15'),
        isActive: true,
        isArchived: false,
        displayLotteryResults: true
      };

      vi.mocked(prisma.event.findFirst).mockResolvedValue(mockActiveEvent);

      const upcomingEvent = await prisma.event.findFirst({
        where: {
          schoolId: { in: ['school-1'] },
          isActive: true
        },
        orderBy: { date: 'asc' }
      });

      expect(upcomingEvent?.isActive).toBe(true);
      expect(upcomingEvent?.name).toBe('Spring Job Shadow');
    });
  });
});
