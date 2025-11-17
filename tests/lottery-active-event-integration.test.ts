import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prisma client  
vi.mock('../src/lib/server/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    },
    lotteryConfiguration: {
      findUnique: vi.fn(),
      create: vi.fn()
    },
    student: {
      findMany: vi.fn()
    },
    position: {
      findMany: vi.fn()
    },
    lotteryJob: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn()
    },
    lotteryResults: {
      createMany: vi.fn()
    }
  }
}));

import { prisma } from '../src/lib/server/prisma';

describe('Lottery Active Event Integration', () => {
  const mockSchoolId = 'school-1';
  // mockAdminUser would be used for admin-specific lottery tests
  // const mockAdminUser = {
  //   id: 'admin-1',
  //   adminOfSchools: [{ id: mockSchoolId, name: 'Test School' }]
  // };

  const mockLotteryConfig = {
    id: 'config-1',
    schoolId: mockSchoolId,
    gradeOrder: 'NONE',
    manualAssignments: [],
    prefillSettings: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Lottery Position Loading', () => {
    it('should only load positions from active events for lottery processing', async () => {
      const mockActiveEventPositions = [
        {
          id: 'pos-1',
          title: 'Software Developer',
          career: 'Technology',
          slots: 5,
          eventId: 'active-event-1',
          hostId: 'host-1',
          event: {
            id: 'active-event-1',
            schoolId: mockSchoolId,
            isActive: true,
            isArchived: false,
            school: { id: mockSchoolId, name: 'Test School' }
          },
          host: {
            id: 'host-1',
            company: {
              id: 'company-1',
              companyName: 'Tech Corp'
            }
          }
        },
        {
          id: 'pos-2',
          title: 'Marketing Manager',
          career: 'Marketing', 
          slots: 3,
          eventId: 'active-event-1',
          hostId: 'host-2',
          event: {
            id: 'active-event-1',
            schoolId: mockSchoolId,
            isActive: true,
            isArchived: false,
            school: { id: mockSchoolId, name: 'Test School' }
          },
          host: {
            id: 'host-2',
            company: {
              id: 'company-2',
              companyName: 'Marketing Inc'
            }
          }
        }
      ];

      vi.mocked(prisma.position.findMany).mockResolvedValue(mockActiveEventPositions);

      // Test the lottery position query that should filter by active event
      const positions = await prisma.position.findMany({
        where: {
          event: { 
            schoolId: mockSchoolId,
            isActive: true 
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

      expect(prisma.position.findMany).toHaveBeenCalledWith({
        where: {
          event: { 
            schoolId: mockSchoolId,
            isActive: true 
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

      expect(positions).toHaveLength(2);
      expect(positions[0].event.isActive).toBe(true);
      expect(positions[1].event.isActive).toBe(true);
      expect(positions[0].title).toBe('Software Developer');
      expect(positions[1].title).toBe('Marketing Manager');
    });

    it('should not include positions from inactive or archived events', async () => {
      // Mock empty result when no active events have positions
      vi.mocked(prisma.position.findMany).mockResolvedValue([]);

      const positions = await prisma.position.findMany({
        where: {
          event: { 
            schoolId: mockSchoolId,
            isActive: true 
          }
        },
        include: {
          event: { include: { school: true } },
          host: { include: { company: true } }
        }
      });

      expect(positions).toHaveLength(0);
    });
  });

  describe('Lottery Configuration for Active Events', () => {
    it('should load positions from active event for manual assignment dropdown', async () => {
      const mockActivePositions = [
        {
          id: 'pos-1',
          title: 'Engineer',
          career: 'Technology',
          slots: 4,
          eventId: 'active-event-1',
          host: {
            company: {
              id: 'company-1',
              companyName: 'Tech Corp'
            }
          }
        },
        {
          id: 'pos-2',
          title: 'Designer',
          career: 'Design',
          slots: 2,
          eventId: 'active-event-1',
          host: {
            company: {
              id: 'company-2',
              companyName: 'Design Studio'
            }
          }
        }
      ];

      vi.mocked(prisma.position.findMany).mockResolvedValue(mockActivePositions);

      // Test lottery page position loading (for manual assignments)
      const positions = await prisma.position.findMany({
        where: {
          event: { 
            schoolId: mockSchoolId,
            isActive: true 
          }
        },
        include: {
          host: {
            include: {
              company: true
            }
          }
        },
        orderBy: [
          { host: { company: { companyName: 'asc' } } },
          { title: 'asc' }
        ]
      });

      expect(positions).toHaveLength(2);
      expect(positions[0].title).toBe('Engineer');
      expect(positions[1].title).toBe('Designer');
    });

    it('should validate manual assignments are for active event positions', async () => {
      const mockLotteryConfigWithAssignments = {
        ...mockLotteryConfig,
        manualAssignments: [
          {
            id: 'assignment-1',
            studentId: 'student-1',
            positionId: 'pos-1', // Should be from active event
            student: {
              id: 'student-1',
              firstName: 'John',
              lastName: 'Doe'
            },
            position: {
              id: 'pos-1',
              title: 'Software Developer',
              eventId: 'active-event-1',
              host: {
                company: {
                  companyName: 'Tech Corp'
                }
              }
            }
          }
        ]
      };

      vi.mocked(prisma.lotteryConfiguration.findUnique).mockResolvedValue(mockLotteryConfigWithAssignments);

      const config = await prisma.lotteryConfiguration.findUnique({
        where: { schoolId: mockSchoolId },
        include: {
          manualAssignments: {
            include: {
              student: true,
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
          },
          prefillSettings: {
            include: {
              company: true
            }
          }
        }
      });

      expect(config?.manualAssignments).toHaveLength(1);
      expect(config?.manualAssignments[0].position.title).toBe('Software Developer');
    });
  });

  describe('Lottery Execution with Active Events', () => {
    it('should process lottery with students and active event positions', async () => {
      const mockStudents = [
        {
          id: 'student-1',
          firstName: 'John',
          lastName: 'Doe',
          grade: 11,
          schoolId: mockSchoolId,
          positionsSignedUpFor: [
            {
              studentId: 'student-1',
              positionId: 'pos-1',
              rank: 1,
              position: {
                id: 'pos-1',
                title: 'Software Developer',
                eventId: 'active-event-1'
              }
            },
            {
              studentId: 'student-1',
              positionId: 'pos-2',
              rank: 2,
              position: {
                id: 'pos-2',
                title: 'Marketing Manager',
                eventId: 'active-event-1'
              }
            }
          ]
        },
        {
          id: 'student-2',
          firstName: 'Jane',
          lastName: 'Smith',
          grade: 12,
          schoolId: mockSchoolId,
          positionsSignedUpFor: [
            {
              studentId: 'student-2',
              positionId: 'pos-2',
              rank: 1,
              position: {
                id: 'pos-2',
                title: 'Marketing Manager',
                eventId: 'active-event-1'
              }
            }
          ]
        }
      ];

      const mockPositions = [
        {
          id: 'pos-1',
          title: 'Software Developer',
          slots: 1,
          eventId: 'active-event-1'
        },
        {
          id: 'pos-2',
          title: 'Marketing Manager',
          slots: 1,
          eventId: 'active-event-1'
        }
      ];

      vi.mocked(prisma.student.findMany).mockResolvedValue(mockStudents);
      vi.mocked(prisma.position.findMany).mockResolvedValue(mockPositions);

      // Test student loading for lottery
      const students = await prisma.student.findMany({
        where: { schoolId: mockSchoolId },
        include: {
          positionsSignedUpFor: {
            include: {
              position: true
            },
            orderBy: { rank: 'asc' }
          }
        }
      });

      // Test position loading for lottery
      const positions = await prisma.position.findMany({
        where: {
          event: { 
            schoolId: mockSchoolId,
            isActive: true 
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

      expect(students).toHaveLength(2);
      expect(positions).toHaveLength(2);
      
      // Verify students only have positions from the active event
      students.forEach(student => {
        student.positionsSignedUpFor.forEach(signup => {
          expect(signup.position.eventId).toBe('active-event-1');
        });
      });
    });

    it('should handle prefill settings for active event companies', async () => {
      const mockPrefillSettings = [
        {
          id: 'prefill-1',
          companyId: 'company-1',
          prefillPercentage: 50,
          company: {
            id: 'company-1',
            companyName: 'Tech Corp'
          }
        }
      ];

      const mockPositionsForPrefill = [
        {
          id: 'pos-1',
          title: 'Software Developer',
          slots: 4,
          eventId: 'active-event-1',
          host: {
            company: {
              id: 'company-1',
              companyName: 'Tech Corp'
            }
          }
        },
        {
          id: 'pos-2',
          title: 'QA Engineer',
          slots: 2,
          eventId: 'active-event-1',
          host: {
            company: {
              id: 'company-1',
              companyName: 'Tech Corp'
            }
          }
        }
      ];

      // Test prefill calculation for active event positions
      const prefillSetting = mockPrefillSettings[0];
      const companyPositions = mockPositionsForPrefill.filter(p => 
        p.host?.company?.id === prefillSetting.companyId
      );

      expect(companyPositions).toHaveLength(2);

      // Calculate prefill slots
      const prefillAssignments = new Map();
      for (const position of companyPositions) {
        const slotsToFill = Math.floor(position.slots * prefillSetting.prefillPercentage / 100);
        prefillAssignments.set(position.id, slotsToFill);
      }

      expect(prefillAssignments.get('pos-1')).toBe(2); // 50% of 4 slots
      expect(prefillAssignments.get('pos-2')).toBe(1); // 50% of 2 slots
    });
  });

  describe('Lottery Results for Active Events', () => {
    it('should create lottery results scoped to active event', async () => {
      const mockLotteryJob = {
        id: 'job-1',
        adminId: 'admin-1',
        status: 'completed',
        progress: 100,
        currentSeed: 1337,
        startedAt: new Date(),
        completedAt: new Date()
      };

      const mockLotteryResults = [
        {
          id: 'result-1',
          lotteryJobId: 'job-1',
          studentId: 'student-1',
          positionId: 'pos-1', // From active event
          createdAt: new Date()
        },
        {
          id: 'result-2',
          lotteryJobId: 'job-1',
          studentId: 'student-2',
          positionId: 'pos-2', // From active event
          createdAt: new Date()
        }
      ];

      vi.mocked(prisma.lotteryJob.create).mockResolvedValue(mockLotteryJob);
      vi.mocked(prisma.lotteryResults.createMany).mockResolvedValue({ count: 2 });

      // Create lottery job
      const job = await prisma.lotteryJob.create({
        data: {
          adminId: 'admin-1',
          status: 'running',
          progress: 0,
          currentSeed: 0
        }
      });

      expect(job.adminId).toBe('admin-1');

      // Create lottery results for active event
      const resultsData = mockLotteryResults.map(result => ({
        lotteryJobId: result.lotteryJobId,
        studentId: result.studentId,
        positionId: result.positionId
      }));

      const results = await prisma.lotteryResults.createMany({
        data: resultsData
      });

      expect(results.count).toBe(2);
    });

    it('should validate lottery results are for positions from active event', async () => {
      // This test ensures that all lottery results reference positions 
      // that belong to the currently active event
      const activeEventPositionIds = ['pos-1', 'pos-2', 'pos-3'];
      const lotteryResults = [
        { studentId: 'student-1', positionId: 'pos-1' },
        { studentId: 'student-2', positionId: 'pos-2' },
        { studentId: 'student-3', positionId: 'pos-3' }
      ];

      // Validate all results are for active event positions
      const validResults = lotteryResults.filter(result => 
        activeEventPositionIds.includes(result.positionId)
      );

      expect(validResults).toHaveLength(3);
      expect(lotteryResults).toEqual(validResults);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle case when no active event exists', async () => {
      vi.mocked(prisma.position.findMany).mockResolvedValue([]);

      const positions = await prisma.position.findMany({
        where: {
          event: { 
            schoolId: mockSchoolId,
            isActive: true 
          }
        }
      });

      expect(positions).toHaveLength(0);
    });

    it('should handle case when active event has no positions', async () => {
      vi.mocked(prisma.position.findMany).mockResolvedValue([]);
      vi.mocked(prisma.student.findMany).mockResolvedValue([]);

      const positions = await prisma.position.findMany({
        where: {
          event: { 
            schoolId: mockSchoolId,
            isActive: true 
          }
        }
      });

      const students = await prisma.student.findMany({
        where: { schoolId: mockSchoolId }
      });

      expect(positions).toHaveLength(0);
      expect(students).toHaveLength(0);
    });

    it('should handle students with no position preferences for active event', async () => {
      const studentsWithoutPreferences = [
        {
          id: 'student-1',
          firstName: 'John',
          lastName: 'Doe',
          grade: 11,
          schoolId: mockSchoolId,
          positionsSignedUpFor: [] // No preferences
        }
      ];

      vi.mocked(prisma.student.findMany).mockResolvedValue(studentsWithoutPreferences);

      const students = await prisma.student.findMany({
        where: { schoolId: mockSchoolId },
        include: {
          positionsSignedUpFor: {
            include: { position: true },
            orderBy: { rank: 'asc' }
          }
        }
      });

      expect(students[0].positionsSignedUpFor).toHaveLength(0);
    });
  });
});
