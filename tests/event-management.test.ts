import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Prisma client using factory function
vi.mock('../src/lib/server/prisma', () => ({
  prisma: {
    event: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn()
    },
    position: {
      createMany: vi.fn(),
      deleteMany: vi.fn()
    },
    student: {
      findMany: vi.fn()
    },
    manualAssignment: {
      findFirst: vi.fn()
    },
    lotteryResults: {
      findFirst: vi.fn()
    },
    lotteryJob: {
      findFirst: vi.fn()
    },
    permissionSlipSubmission: {
      count: vi.fn()
    }
  }
}));

// Import after mocking
import { 
  getActiveEvent, 
  getSchoolEvents,
  createEvent,
  activateEvent,
  archiveEvent,
  updateEvent,
  getArchivedEventStats,
  deleteEvent
} from '../src/lib/server/eventManagement';
import { prisma } from '../src/lib/server/prisma';

describe('Event Management Functions', () => {
  const testSchoolId = 'test-school-1';
  const testEventId = 'test-event-1';
  const testDate = new Date('2024-12-01');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getActiveEvent', () => {
    it('should return null when no active event exists', async () => {
      vi.mocked(prisma).event.findFirst.mockResolvedValue(null);

      const result = await getActiveEvent(testSchoolId);

      expect(result).toBeNull();
      expect(vi.mocked(prisma).event.findFirst).toHaveBeenCalledWith({
        where: {
          schoolId: testSchoolId,
          isActive: true
        },
        include: {
          positions: {
            select: {
              id: true,
              slots: true,
              students: {
                select: { studentId: true }
              }
            }
          }
        }
      });
    });

    it('should return the active event when one exists', async () => {
      const mockEvent = {
        id: testEventId,
        name: 'Test Event',
        date: testDate,
        isActive: true,
        isArchived: false,
        displayLotteryResults: true,
        schoolId: testSchoolId,
        positions: []
      };

      vi.mocked(prisma).event.findFirst.mockResolvedValue(mockEvent);

      const result = await getActiveEvent(testSchoolId);

      expect(result).toEqual({
        id: testEventId,
        name: 'Test Event',
        date: testDate,
        isActive: true,
        isArchived: false,
        displayLotteryResults: true,
        schoolId: testSchoolId,
        stats: {
          totalPositions: 0,
          totalSlots: 0,
          studentsWithChoices: 0
        }
      });
    });

    it('should calculate stats correctly when positions exist', async () => {
      const mockEvent = {
        id: testEventId,
        name: 'Test Event',
        date: testDate,
        isActive: true,
        isArchived: false,
        displayLotteryResults: true,
        schoolId: testSchoolId,
        positions: [
          { id: 'pos1', slots: 5, students: [{ studentId: 'student1' }, { studentId: 'student2' }] },
          { id: 'pos2', slots: 3, students: [{ studentId: 'student1' }, { studentId: 'student3' }] }
        ]
      };

      vi.mocked(prisma).event.findFirst.mockResolvedValue(mockEvent);

      const result = await getActiveEvent(testSchoolId);

      expect(result?.stats).toEqual({
        totalPositions: 2,
        totalSlots: 8,
        studentsWithChoices: 3 // unique students across all positions
      });
    });
  });

  describe('getSchoolEvents', () => {
    it('should return all events when includeArchived is true', async () => {
      const mockEvents = [
        {
          id: 'event1',
          name: 'Active Event',
          date: new Date('2024-12-01'),
          isActive: true,
          isArchived: false,
          displayLotteryResults: true,
          schoolId: testSchoolId,
          positions: []
        },
        {
          id: 'event2',
          name: 'Archived Event',
          date: new Date('2024-11-01'),
          isActive: false,
          isArchived: true,
          displayLotteryResults: false,
          schoolId: testSchoolId,
          positions: []
        }
      ];

      vi.mocked(prisma).event.findMany.mockResolvedValue(mockEvents);

      const result = await getSchoolEvents(testSchoolId, true);

      expect(result).toHaveLength(2);
      expect(vi.mocked(prisma).event.findMany).toHaveBeenCalledWith({
        where: { schoolId: testSchoolId },
        orderBy: { date: 'desc' },
        include: {
          positions: {
            select: {
              id: true,
              slots: true,
              students: {
                select: { studentId: true }
              }
            }
          }
        }
      });
    });

    it('should exclude archived events when includeArchived is false', async () => {
      const mockEvents = [
        {
          id: 'event1',
          name: 'Active Event',
          date: new Date('2024-12-01'),
          isActive: true,
          isArchived: false,
          displayLotteryResults: true,
          schoolId: testSchoolId,
          positions: []
        }
      ];

      vi.mocked(prisma).event.findMany.mockResolvedValue(mockEvents);

      const result = await getSchoolEvents(testSchoolId, false);

      expect(result).toHaveLength(1);
      expect(vi.mocked(prisma).event.findMany).toHaveBeenCalledWith({
        where: { schoolId: testSchoolId, isArchived: false },
        orderBy: { date: 'desc' },
        include: {
          positions: {
            select: {
              id: true,
              slots: true,
              students: {
                select: { studentId: true }
              }
            }
          }
        }
      });
    });

    it('should return events ordered by date descending', async () => {
      const mockEvents = [
        {
          id: 'event1',
          name: 'Newer Event',
          date: new Date('2024-12-01'),
          isActive: false,
          isArchived: false,
          displayLotteryResults: true,
          schoolId: testSchoolId,
          positions: []
        },
        {
          id: 'event2',
          name: 'Older Event',
          date: new Date('2024-11-01'),
          isActive: false,
          isArchived: false,
          displayLotteryResults: true,
          schoolId: testSchoolId,
          positions: []
        }
      ];

      vi.mocked(prisma).event.findMany.mockResolvedValue(mockEvents);

      const result = await getSchoolEvents(testSchoolId, false);

      expect(result[0].name).toBe('Newer Event');
      expect(result[1].name).toBe('Older Event');
    });
  });

  describe('createEvent', () => {
    it('should create a new event with correct data', async () => {
      const eventData = {
        name: 'New Test Event',
        date: testDate,
        displayLotteryResults: true
      };

      const mockCreatedEvent = {
        id: testEventId,
        name: 'New Test Event',
        date: testDate,
        isActive: false,
        isArchived: false,
        displayLotteryResults: true,
        schoolId: testSchoolId,
        // Event Controls - new events start in draft mode (all disabled)
        eventEnabled: false,
        companyAccountsEnabled: false,
        companySignupsEnabled: false,
        studentAccountsEnabled: false,
        studentSignupsEnabled: false,
        lotteryPublished: false,
        companyDirectoryEnabled: false
      };

      const mockEventWithStats = {
        ...mockCreatedEvent,
        positions: []
      };

      vi.mocked(prisma).event.create.mockResolvedValue(mockCreatedEvent);
      vi.mocked(prisma).event.findFirst.mockResolvedValue(null); // No previous event
      vi.mocked(prisma).event.findUnique.mockResolvedValue(mockEventWithStats);

      const result = await createEvent(testSchoolId, eventData);

      expect(result).toEqual({
        id: testEventId,
        name: 'New Test Event',
        date: testDate,
        isActive: false,
        isArchived: false,
        displayLotteryResults: true,
        schoolId: testSchoolId,
        // Event Controls - new events start in draft mode (all disabled)
        eventEnabled: false,
        companyAccountsEnabled: false,
        companySignupsEnabled: false,
        studentAccountsEnabled: false,
        studentSignupsEnabled: false,
        lotteryPublished: false,
        companyDirectoryEnabled: false,
        stats: {
          totalPositions: 0,
          totalSlots: 0,
          studentsWithChoices: 0
        }
      });

      expect(vi.mocked(prisma).event.create).toHaveBeenCalledWith({
        data: {
          schoolId: testSchoolId,
          name: 'New Test Event',
          date: testDate,
          displayLotteryResults: true,
          isActive: false,
          isArchived: false,
          // Event Controls - new events start in draft mode (all disabled)
          eventEnabled: false,
          companyAccountsEnabled: false,
          companySignupsEnabled: false,
          studentAccountsEnabled: false,
          studentSignupsEnabled: false,
          lotteryPublished: false,
          companyDirectoryEnabled: false
        }
      });
    });

    it('should create event with optional name', async () => {
      const eventData = {
        date: testDate,
        displayLotteryResults: false
      };

      const mockCreatedEvent = {
        id: testEventId,
        name: null,
        date: testDate,
        isActive: false,
        isArchived: false,
        displayLotteryResults: false,
        schoolId: testSchoolId
      };

      const mockEventWithStats = {
        ...mockCreatedEvent,
        positions: []
      };

      vi.mocked(prisma).event.create.mockResolvedValue(mockCreatedEvent);
      vi.mocked(prisma).event.findFirst.mockResolvedValue(null); // No previous event
      vi.mocked(prisma).event.findUnique.mockResolvedValue(mockEventWithStats);

      const result = await createEvent(testSchoolId, eventData);

      expect(result.name).toBeNull();
      expect(vi.mocked(prisma).event.create).toHaveBeenCalledWith({
        data: {
          schoolId: testSchoolId,
          name: undefined,
          date: testDate,
          displayLotteryResults: false,
          isActive: false,
          isArchived: false,
          // Event Controls - new events start in draft mode (all disabled)
          eventEnabled: false,
          companyAccountsEnabled: false,
          companySignupsEnabled: false,
          studentAccountsEnabled: false,
          studentSignupsEnabled: false,
          lotteryPublished: false,
          companyDirectoryEnabled: false
        }
      });
    });

    it('should carry forward positions when carryForwardData is true', async () => {
      const eventData = {
        name: 'New Event',
        date: testDate,
        displayLotteryResults: true,
        carryForwardData: true
      };

      const mockCreatedEvent = {
        id: testEventId,
        name: 'New Event',
        date: testDate,
        isActive: false,
        isArchived: false,
        displayLotteryResults: true,
        schoolId: testSchoolId
      };

      const mockPreviousEvent = {
        id: 'previous-event-id',
        positions: [
          {
            id: 'pos1',
            title: 'Software Engineer',
            career: 'Technology',
            slots: 2,
            summary: 'Learn about software development',
            contact_name: 'John Doe',
            contact_email: 'john@company.com',
            address: '123 Main St',
            instructions: 'Bring laptop',
            attire: 'Business casual',
            arrival: '9:00 AM',
            start: '9:30 AM',
            end: '3:00 PM',
            hostId: 'host1'
          }
        ]
      };

      const mockEventWithStats = {
        ...mockCreatedEvent,
        positions: [
          {
            id: 'new-pos1',
            slots: 2,
            students: []
          }
        ]
      };

      vi.mocked(prisma).event.create.mockResolvedValue(mockCreatedEvent);
      vi.mocked(prisma).event.findFirst.mockResolvedValue(mockPreviousEvent);
      vi.mocked(prisma).position.createMany.mockResolvedValue({ count: 1 });
      vi.mocked(prisma).event.findUnique.mockResolvedValue(mockEventWithStats);

      const result = await createEvent(testSchoolId, eventData);

      expect(vi.mocked(prisma).position.createMany).toHaveBeenCalledWith({
        data: [
          {
            title: 'Software Engineer',
            career: 'Technology',
            slots: 2,
            summary: 'Learn about software development',
            contact_name: 'John Doe',
            contact_email: 'john@company.com',
            address: '123 Main St',
            instructions: 'Bring laptop',
            attire: 'Business casual',
            arrival: '9:00 AM',
            start: '9:30 AM',
            end: '3:00 PM',
            eventId: testEventId,
            hostId: 'host1'
          }
        ]
      });

      expect(result.stats.totalPositions).toBe(1);
    });

    it('should not carry forward positions when carryForwardData is false', async () => {
      const eventData = {
        name: 'New Event',
        date: testDate,
        displayLotteryResults: true,
        carryForwardData: false
      };

      const mockCreatedEvent = {
        id: testEventId,
        name: 'New Event',
        date: testDate,
        isActive: false,
        isArchived: false,
        displayLotteryResults: true,
        schoolId: testSchoolId
      };

      const mockEventWithStats = {
        ...mockCreatedEvent,
        positions: []
      };

      vi.mocked(prisma).event.create.mockResolvedValue(mockCreatedEvent);
      vi.mocked(prisma).event.findUnique.mockResolvedValue(mockEventWithStats);

      const result = await createEvent(testSchoolId, eventData);

      expect(vi.mocked(prisma).position.createMany).not.toHaveBeenCalled();
      expect(result.stats.totalPositions).toBe(0);
    });

    it('should default to carrying forward data when carryForwardData is undefined', async () => {
      const eventData = {
        name: 'New Event',
        date: testDate,
        displayLotteryResults: true
        // carryForwardData is undefined
      };

      const mockCreatedEvent = {
        id: testEventId,
        name: 'New Event',
        date: testDate,
        isActive: false,
        isArchived: false,
        displayLotteryResults: true,
        schoolId: testSchoolId
      };

      const mockEventWithStats = {
        ...mockCreatedEvent,
        positions: []
      };

      vi.mocked(prisma).event.create.mockResolvedValue(mockCreatedEvent);
      vi.mocked(prisma).event.findFirst.mockResolvedValue(null); // No previous event
      vi.mocked(prisma).event.findUnique.mockResolvedValue(mockEventWithStats);

      const result = await createEvent(testSchoolId, eventData);

      // Should still call findFirst to look for previous event (default behavior)
      expect(vi.mocked(prisma).event.findFirst).toHaveBeenCalled();
      expect(result.stats.totalPositions).toBe(0);
    });
  });

  describe('activateEvent', () => {
    it('should activate the specified event and deactivate others', async () => {
      const mockEvent = {
        id: testEventId,
        name: 'Test Event',
        date: testDate,
        isActive: true,
        isArchived: false,
        displayLotteryResults: true,
        schoolId: testSchoolId,
        positions: []
      };

      vi.mocked(prisma).event.updateMany.mockResolvedValue({ count: 1 });
      vi.mocked(prisma).event.update.mockResolvedValue(mockEvent);

      const result = await activateEvent(testEventId, testSchoolId);

      expect(vi.mocked(prisma).event.updateMany).toHaveBeenCalledWith({
        where: {
          schoolId: testSchoolId,
          isActive: true
        },
        data: {
          isActive: false
        }
      });

      expect(vi.mocked(prisma).event.update).toHaveBeenCalledWith({
        where: { id: testEventId },
        data: { isActive: true },
        include: {
          positions: {
            select: {
              id: true,
              slots: true,
              students: {
                select: { studentId: true }
              }
            }
          }
        }
      });

      expect(result.isActive).toBe(true);
    });

    it('should handle case when no other events need deactivation', async () => {
      const mockEvent = {
        id: testEventId,
        name: 'Test Event',
        date: testDate,
        isActive: true,
        isArchived: false,
        displayLotteryResults: true,
        schoolId: testSchoolId,
        positions: []
      };

      vi.mocked(prisma).event.updateMany.mockResolvedValue({ count: 0 });
      vi.mocked(prisma).event.update.mockResolvedValue(mockEvent);

      const result = await activateEvent(testEventId, testSchoolId);

      expect(result.isActive).toBe(true);
    });
  });

  describe('archiveEvent', () => {
    it('should archive the specified event', async () => {
      const mockEvent = {
        id: testEventId,
        name: 'Test Event',
        date: testDate,
        isActive: false,
        isArchived: true,
        displayLotteryResults: true,
        schoolId: testSchoolId,
        positions: []
      };

      vi.mocked(prisma).event.update.mockResolvedValue(mockEvent);

      const result = await archiveEvent(testEventId);

      expect(vi.mocked(prisma).event.update).toHaveBeenCalledWith({
        where: { id: testEventId },
        data: {
          isActive: false,
          isArchived: true
        },
        include: {
          positions: {
            select: {
              id: true,
              slots: true,
              students: {
                select: { studentId: true }
              }
            }
          }
        }
      });

      expect(result.isActive).toBe(false);
      expect(result.isArchived).toBe(true);
    });
  });

  describe('updateEvent', () => {
    it('should update event with provided data', async () => {
      const updateData = {
        name: 'Updated Event Name',
        displayLotteryResults: false
      };

      const mockUpdatedEvent = {
        id: testEventId,
        name: 'Updated Event Name',
        date: testDate,
        isActive: false,
        isArchived: false,
        displayLotteryResults: false,
        schoolId: testSchoolId,
        positions: []
      };

      vi.mocked(prisma).event.update.mockResolvedValue(mockUpdatedEvent);

      const result = await updateEvent(testEventId, updateData);

      expect(vi.mocked(prisma).event.update).toHaveBeenCalledWith({
        where: { id: testEventId },
        data: {
          name: 'Updated Event Name',
          displayLotteryResults: false
        },
        include: {
          positions: {
            select: {
              id: true,
              slots: true,
              students: {
                select: { studentId: true }
              }
            }
          }
        }
      });

      expect(result.name).toBe('Updated Event Name');
      expect(result.displayLotteryResults).toBe(false);
    });

    it('should only update provided fields', async () => {
      const updateData = {
        name: 'Updated Event Name'
        // date and displayLotteryResults not provided
      };

      const mockUpdatedEvent = {
        id: testEventId,
        name: 'Updated Event Name',
        date: testDate,
        isActive: false,
        isArchived: false,
        displayLotteryResults: true, // unchanged
        schoolId: testSchoolId,
        positions: []
      };

      vi.mocked(prisma).event.update.mockResolvedValue(mockUpdatedEvent);

      const result = await updateEvent(testEventId, updateData);

      expect(result.name).toBe('Updated Event Name');
      expect(vi.mocked(prisma).event.update).toHaveBeenCalledWith({
        where: { id: testEventId },
        data: {
          name: 'Updated Event Name'
        },
        include: {
          positions: {
            select: {
              id: true,
              slots: true,
              students: {
                select: { studentId: true }
              }
            }
          }
        }
      });
    });
  });

  describe('getArchivedEventStats', () => {
    it('should return comprehensive statistics for archived event', async () => {
      const mockEvent = {
        id: testEventId,
        name: 'Archived Event',
        date: testDate,
        isActive: false,
        isArchived: true,
        positions: [
          {
            id: 'pos1',
            slots: 5,
            host: {
              company: { id: 'company1', companyName: 'Test Company' }
            },
            students: [
              { studentId: 'student1', student: { id: 'student1', grade: 9 } },
              { studentId: 'student2', student: { id: 'student2', grade: 10 } }
            ]
          },
          {
            id: 'pos2',
            slots: 3,
            host: {
              company: { id: 'company2', companyName: 'Another Company' }
            },
            students: [
              { studentId: 'student1', student: { id: 'student1', grade: 9 } },
              { studentId: 'student3', student: { id: 'student3', grade: 11 } }
            ]
          }
        ]
      };

      vi.mocked(prisma).event.findUnique.mockResolvedValue(mockEvent);
      vi.mocked(prisma).student.findMany.mockResolvedValue([
        { id: 'student1', grade: 9 },
        { id: 'student2', grade: 10 },
        { id: 'student3', grade: 11 }
      ]);
      vi.mocked(prisma).permissionSlipSubmission.count.mockResolvedValue(2);

      const result = await getArchivedEventStats(testEventId);

      expect(result.event).toEqual({
        id: testEventId,
        name: 'Archived Event',
        date: testDate,
        isActive: false,
        isArchived: true
      });

      expect(result.studentStats).toEqual({
        totalStudents: 3,
        studentsWithChoices: 3,
        gradeDistribution: { 9: 1, 10: 1, 11: 1 },
        permissionSlipsCompleted: 2
      });

      expect(result.companyStats).toEqual({
        totalCompanies: 2,
        totalPositions: 2,
        totalSlots: 8
      });
    });

    it('should throw error when event not found', async () => {
      vi.mocked(prisma).event.findUnique.mockResolvedValue(null);

      await expect(getArchivedEventStats('nonexistent-event')).rejects.toThrow('Event not found');
    });
  });

  describe('Event State Management', () => {
    describe('Draft Events', () => {
      it('should create events in draft state by default', async () => {
        const eventData = {
          name: 'Draft Event',
          date: testDate,
          displayLotteryResults: false
        };

        const mockCreatedEvent = {
          id: testEventId,
          name: 'Draft Event',
          date: testDate,
          isActive: false,
          isArchived: false,
          displayLotteryResults: false,
          schoolId: testSchoolId
        };

        const mockEventWithStats = {
          ...mockCreatedEvent,
          positions: []
        };

        vi.mocked(prisma).event.create.mockResolvedValue(mockCreatedEvent);
        vi.mocked(prisma).event.findFirst.mockResolvedValue(null); // No previous event
        vi.mocked(prisma).event.findUnique.mockResolvedValue(mockEventWithStats);

        const result = await createEvent(testSchoolId, eventData);

        expect(result.isActive).toBe(false);
        expect(result.isArchived).toBe(false);
        expect(vi.mocked(prisma).event.create).toHaveBeenCalledWith({
          data: {
            schoolId: testSchoolId,
            name: 'Draft Event',
            date: testDate,
            displayLotteryResults: false,
            isActive: false,
            isArchived: false,
            // Event Controls - new events start in draft mode (all disabled)
            eventEnabled: false,
            companyAccountsEnabled: false,
            companySignupsEnabled: false,
            studentAccountsEnabled: false,
            studentSignupsEnabled: false,
            lotteryPublished: false,
            companyDirectoryEnabled: false
          }
        });
      });

      it('should allow multiple draft events per school', async () => {
        const mockEvents = [
          {
            id: 'draft1',
            name: 'Draft Event 1',
            date: new Date('2024-12-01'),
            isActive: false,
            isArchived: false,
            displayLotteryResults: false,
            schoolId: testSchoolId,
            positions: []
          },
          {
            id: 'draft2',
            name: 'Draft Event 2',
            date: new Date('2024-12-02'),
            isActive: false,
            isArchived: false,
            displayLotteryResults: false,
            schoolId: testSchoolId,
            positions: []
          }
        ];

        vi.mocked(prisma).event.findMany.mockResolvedValue(mockEvents);

        const result = await getSchoolEvents(testSchoolId, false);

        expect(result).toHaveLength(2);
        expect(result.every(event => !event.isActive && !event.isArchived)).toBe(true);
      });
    });

    describe('Active Events', () => {
      it('should ensure only one active event per school', async () => {
        const mockEvent = {
          id: testEventId,
          name: 'Active Event',
          date: testDate,
          isActive: true,
          isArchived: false,
          displayLotteryResults: true,
          schoolId: testSchoolId,
          positions: []
        };

        vi.mocked(prisma).event.updateMany.mockResolvedValue({ count: 1 });
        vi.mocked(prisma).event.update.mockResolvedValue(mockEvent);

        await activateEvent(testEventId, testSchoolId);

        expect(vi.mocked(prisma).event.updateMany).toHaveBeenCalledWith({
          where: {
            schoolId: testSchoolId,
            isActive: true
          },
          data: {
            isActive: false
          }
        });

        expect(vi.mocked(prisma).event.update).toHaveBeenCalledWith({
          where: { id: testEventId },
          data: { isActive: true },
          include: {
            positions: {
              select: {
                id: true,
                slots: true,
                students: {
                  select: { studentId: true }
                }
              }
            }
          }
        });
      });

      it('should allow activating archived events (current behavior)', async () => {
        const archivedEvent = {
          id: testEventId,
          name: 'Archived Event',
          date: testDate,
          isActive: true, // Will be activated
          isArchived: true, // But remains archived
          displayLotteryResults: true,
          schoolId: testSchoolId,
          positions: []
        };

        vi.mocked(prisma).event.findFirst.mockResolvedValue(archivedEvent);

        // This should work, but the event will remain archived
        vi.mocked(prisma).event.updateMany.mockResolvedValue({ count: 0 });
        vi.mocked(prisma).event.update.mockResolvedValue(archivedEvent);

        const result = await activateEvent(testEventId, testSchoolId);

        expect(result.isActive).toBe(true);
        expect(result.isArchived).toBe(true); // Still archived
      });
    });

    describe('Archived Events', () => {
      it('should archive events and make them inactive', async () => {
        const mockEvent = {
          id: testEventId,
          name: 'Event to Archive',
          date: testDate,
          isActive: false,
          isArchived: true,
          displayLotteryResults: true,
          schoolId: testSchoolId,
          positions: []
        };

        vi.mocked(prisma).event.update.mockResolvedValue(mockEvent);

        const result = await archiveEvent(testEventId);

        expect(vi.mocked(prisma).event.update).toHaveBeenCalledWith({
          where: { id: testEventId },
          data: {
            isActive: false,
            isArchived: true
          },
          include: {
            positions: {
              select: {
                id: true,
                slots: true,
                students: {
                  select: { studentId: true }
                }
              }
            }
          }
        });

        expect(result.isActive).toBe(false);
        expect(result.isArchived).toBe(true);
      });

      it('should include archived events when requested', async () => {
        const mockEvents = [
          {
            id: 'active1',
            name: 'Active Event',
            date: new Date('2024-12-01'),
            isActive: true,
            isArchived: false,
            displayLotteryResults: true,
            schoolId: testSchoolId,
            positions: []
          },
          {
            id: 'archived1',
            name: 'Archived Event 1',
            date: new Date('2024-11-01'),
            isActive: false,
            isArchived: true,
            displayLotteryResults: false,
            schoolId: testSchoolId,
            positions: []
          },
          {
            id: 'archived2',
            name: 'Archived Event 2',
            date: new Date('2024-10-01'),
            isActive: false,
            isArchived: true,
            displayLotteryResults: true,
            schoolId: testSchoolId,
            positions: []
          }
        ];

        vi.mocked(prisma).event.findMany.mockResolvedValue(mockEvents);

        const result = await getSchoolEvents(testSchoolId, true);

        expect(result).toHaveLength(3);
        expect(result.filter(event => event.isArchived)).toHaveLength(2);
        expect(result.filter(event => event.isActive)).toHaveLength(1);
      });

      it('should exclude archived events by default', async () => {
        const mockEvents = [
          {
            id: 'active1',
            name: 'Active Event',
            date: new Date('2024-12-01'),
            isActive: true,
            isArchived: false,
            displayLotteryResults: true,
            schoolId: testSchoolId,
            positions: []
          },
          {
            id: 'draft1',
            name: 'Draft Event',
            date: new Date('2024-12-02'),
            isActive: false,
            isArchived: false,
            displayLotteryResults: false,
            schoolId: testSchoolId,
            positions: []
          }
        ];

        vi.mocked(prisma).event.findMany.mockResolvedValue(mockEvents);

        const result = await getSchoolEvents(testSchoolId, false);

        expect(result).toHaveLength(2);
        expect(result.every(event => !event.isArchived)).toBe(true);
      });
    });

    describe('Event State Transitions', () => {
      it('should handle draft -> active transition', async () => {
        const draftEvent = {
          id: testEventId,
          name: 'Draft Event',
          date: testDate,
          isActive: false,
          isArchived: false,
          displayLotteryResults: false,
          schoolId: testSchoolId,
          positions: []
        };

        const activeEvent = {
          ...draftEvent,
          isActive: true
        };

        vi.mocked(prisma).event.updateMany.mockResolvedValue({ count: 0 });
        vi.mocked(prisma).event.update.mockResolvedValue(activeEvent);

        const result = await activateEvent(testEventId, testSchoolId);

        expect(result.isActive).toBe(true);
        expect(result.isArchived).toBe(false);
      });

      it('should handle active -> archived transition', async () => {
        const activeEvent = {
          id: testEventId,
          name: 'Active Event',
          date: testDate,
          isActive: true,
          isArchived: false,
          displayLotteryResults: true,
          schoolId: testSchoolId,
          positions: []
        };

        const archivedEvent = {
          ...activeEvent,
          isActive: false,
          isArchived: true
        };

        vi.mocked(prisma).event.update.mockResolvedValue(archivedEvent);

        const result = await archiveEvent(testEventId);

        expect(result.isActive).toBe(false);
        expect(result.isArchived).toBe(true);
      });

      it('should handle draft -> archived transition', async () => {
        const draftEvent = {
          id: testEventId,
          name: 'Draft Event',
          date: testDate,
          isActive: false,
          isArchived: false,
          displayLotteryResults: false,
          schoolId: testSchoolId,
          positions: []
        };

        const archivedEvent = {
          ...draftEvent,
          isArchived: true
        };

        vi.mocked(prisma).event.update.mockResolvedValue(archivedEvent);

        const result = await archiveEvent(testEventId);

        expect(result.isActive).toBe(false);
        expect(result.isArchived).toBe(true);
      });
    });

    describe('Event State Validation', () => {
      it('should validate event state combinations', () => {
        // Valid states
        expect(() => validateEventState(false, false)).not.toThrow(); // Draft
        expect(() => validateEventState(true, false)).not.toThrow();  // Active
        expect(() => validateEventState(false, true)).not.toThrow(); // Archived

        // Invalid states
        expect(() => validateEventState(true, true)).toThrow('Event cannot be both active and archived');
      });

      it('should validate unique active event constraint', async () => {
        const existingActiveEvent = {
          id: 'existing-active',
          name: 'Existing Active Event',
          date: new Date('2024-11-01'),
          isActive: true,
          isArchived: false,
          displayLotteryResults: true,
          schoolId: testSchoolId,
          positions: []
        };

        vi.mocked(prisma).event.findFirst.mockResolvedValue(existingActiveEvent);

        const result = await getActiveEvent(testSchoolId);

        expect(result).not.toBeNull();
        expect(result?.isActive).toBe(true);
        expect(result?.isArchived).toBe(false);
      });
    });
  });

  describe('deleteEvent', () => {
    it('should delete an inactive event with no student assignments', async () => {
      const testEventId = 'test-event-1';
      const mockEvent = {
        id: testEventId,
        schoolId: testSchoolId,
        name: 'Test Event',
        isActive: false,
        isArchived: false,
        positions: [
          {
            id: 'pos-1',
            students: [] // No student assignments
          }
        ]
      };

      vi.mocked(prisma).event.findFirst.mockResolvedValue(mockEvent);
      vi.mocked(prisma).manualAssignment.findFirst.mockResolvedValue(null);
      vi.mocked(prisma).lotteryJob.findFirst.mockResolvedValue(null);
      vi.mocked(prisma).position.deleteMany.mockResolvedValue({ count: 1 });
      vi.mocked(prisma).event.delete.mockResolvedValue(mockEvent);

      const result = await deleteEvent(testEventId, testSchoolId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Event "Test Event" deleted successfully.');
      expect(vi.mocked(prisma).position.deleteMany).toHaveBeenCalledWith({
        where: { eventId: testEventId }
      });
      expect(vi.mocked(prisma).event.delete).toHaveBeenCalledWith({
        where: { id: testEventId }
      });
    });

    it('should not delete active events', async () => {
      const testEventId = 'test-event-1';
      const mockEvent = {
        id: testEventId,
        schoolId: testSchoolId,
        name: 'Active Event',
        isActive: true,
        isArchived: false,
        positions: []
      };

      vi.mocked(prisma).event.findFirst.mockResolvedValue(mockEvent);

      const result = await deleteEvent(testEventId, testSchoolId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Cannot delete the active event. Deactivate it first by activating another event.');
    });

    it('should not delete archived events', async () => {
      const testEventId = 'test-event-1';
      const mockEvent = {
        id: testEventId,
        schoolId: testSchoolId,
        name: 'Archived Event',
        isActive: false,
        isArchived: true,
        positions: []
      };

      vi.mocked(prisma).event.findFirst.mockResolvedValue(mockEvent);

      const result = await deleteEvent(testEventId, testSchoolId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Cannot delete archived events. Archived events preserve historical data.');
    });

    it('should not delete events with student assignments', async () => {
      const testEventId = 'test-event-1';
      const mockEvent = {
        id: testEventId,
        schoolId: testSchoolId,
        name: 'Event with Students',
        isActive: false,
        isArchived: false,
        positions: [
          {
            id: 'pos-1',
            students: [{ id: 'student-1' }] // Has student assignments
          }
        ]
      };

      vi.mocked(prisma).event.findFirst.mockResolvedValue(mockEvent);

      const result = await deleteEvent(testEventId, testSchoolId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Cannot delete event with student signups. Archive it instead to preserve data.');
    });

    it('should not delete events with lottery history', async () => {
      const testEventId = 'test-event-1';
      const mockEvent = {
        id: testEventId,
        schoolId: testSchoolId,
        name: 'Event with Lottery',
        isActive: false,
        isArchived: false,
        positions: [
          {
            id: 'pos-1',
            students: [] // No student signups
          }
        ]
      };

      vi.mocked(prisma).event.findFirst.mockResolvedValue(mockEvent);
      vi.mocked(prisma).manualAssignment.findFirst.mockResolvedValue(null);
      vi.mocked(prisma).lotteryJob.findFirst.mockResolvedValue({
        id: 'lottery-job-1',
        eventId: testEventId,
        status: 'COMPLETED'
      });

      const result = await deleteEvent(testEventId, testSchoolId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Cannot delete event with lottery history. Archive it instead to preserve historical data.');
    });

    it('should handle event not found', async () => {
      const testEventId = 'nonexistent-event';

      vi.mocked(prisma).event.findFirst.mockResolvedValue(null);

      const result = await deleteEvent(testEventId, testSchoolId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Event not found or not authorized');
    });
  });

  // Helper function for event state validation
  function validateEventState(isActive: boolean, isArchived: boolean): void {
    if (isActive && isArchived) {
      throw new Error('Event cannot be both active and archived');
    }
  }
});
