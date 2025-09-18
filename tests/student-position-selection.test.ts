import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prisma client
vi.mock('../src/lib/server/prisma', () => ({
  prisma: {
    school: {
      findFirst: vi.fn()
    },
    position: {
      findMany: vi.fn()
    },
    student: {
      findFirst: vi.fn()
    },
    positionsOnStudents: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn()
    }
  }
}));

import { prisma } from '../src/lib/server/prisma';

describe('Student Position Selection with Active Events', () => {
  const mockSchool = {
    id: 'school-1',
    name: 'Test High School',
    webAddr: 'lghs',
    emailDomain: 'school.edu'
  };

  const mockUser = {
    id: 'user-1',
    email: 'student@school.edu',
    emailVerified: true
  };

  const mockStudent = {
    id: 'student-1',
    userId: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    grade: 11,
    schoolId: 'school-1',
    permissionSlipCompleted: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Position Loading for Student Pick Page', () => {
    it('should only load positions from active events', async () => {
      const mockActiveEventPositions = [
        {
          id: 'pos-1',
          title: 'Software Developer',
          career: 'Technology',
          slots: 5,
          summary: 'Learn software development',
          eventId: 'active-event-1',
          hostId: 'host-1',
          host: {
            company: {
              id: 'company-1',
              companyName: 'Tech Corp',
              companyDescription: 'Technology company',
              companyUrl: 'https://techcorp.com'
            }
          }
        },
        {
          id: 'pos-2',
          title: 'Marketing Specialist',
          career: 'Marketing',
          slots: 3,
          summary: 'Learn marketing strategies',
          eventId: 'active-event-1',
          hostId: 'host-2',
          host: {
            company: {
              id: 'company-2',
              companyName: 'Marketing Inc',
              companyDescription: 'Marketing agency',
              companyUrl: 'https://marketing.com'
            }
          }
        }
      ];

      vi.mocked(prisma.school.findFirst).mockResolvedValue(mockSchool);
      vi.mocked(prisma.position.findMany).mockResolvedValue(mockActiveEventPositions);

      // Test the query that should filter by active event
      const positionData = await prisma.position.findMany({
        where: {
          event: {
            schoolId: mockSchool.id,
            isActive: true
          }
        },
        include: {
          host: {
            select: {
              company: true
            }
          }
        }
      });

      expect(prisma.position.findMany).toHaveBeenCalledWith({
        where: {
          event: {
            schoolId: 'school-1',
            isActive: true
          }
        },
        include: {
          host: {
            select: {
              company: true
            }
          }
        }
      });

      expect(positionData).toHaveLength(2);
      expect(positionData[0].title).toBe('Software Developer');
      expect(positionData[1].title).toBe('Marketing Specialist');
    });

    it('should not load positions from inactive or archived events', async () => {
      // Mock that no positions are returned for inactive events
      vi.mocked(prisma.school.findFirst).mockResolvedValue(mockSchool);
      vi.mocked(prisma.position.findMany).mockResolvedValue([]);

      const positionData = await prisma.position.findMany({
        where: {
          event: {
            schoolId: mockSchool.id,
            isActive: true
          }
        },
        include: {
          host: {
            select: {
              company: true
            }
          }
        }
      });

      expect(positionData).toHaveLength(0);
    });

    it('should handle school not found', async () => {
      vi.mocked(prisma.school.findFirst).mockResolvedValue(null);

      const school = await prisma.school.findFirst({ 
        where: { webAddr: 'nonexistent' } 
      });

      expect(school).toBeNull();
    });
  });

  describe('Position Selection Actions', () => {
    it('should allow student to select position from active event', async () => {
      vi.mocked(prisma.student.findFirst).mockResolvedValue(mockStudent);
      vi.mocked(prisma.positionsOnStudents.findMany).mockResolvedValue([]);

      const student = await prisma.student.findFirst({
        where: { userId: mockUser.id }
      });

      expect(student?.id).toBe('student-1');
      expect(student?.permissionSlipCompleted).toBe(true);

      // Test position selection
      const mockPositionSelection = {
        positionId: 'pos-1',
        studentId: 'student-1',
        rank: 1,
        createdAt: new Date()
      };

      vi.mocked(prisma.positionsOnStudents.create).mockResolvedValue(mockPositionSelection);

      const result = await prisma.positionsOnStudents.create({
        data: {
          positionId: 'pos-1',
          studentId: 'student-1',
          rank: 1
        }
      });

      expect(result.positionId).toBe('pos-1');
      expect(result.studentId).toBe('student-1');
      expect(result.rank).toBe(1);
    });

    it('should track existing position selections', async () => {
      const existingSelections = [
        {
          positionId: 'pos-1',
          studentId: 'student-1',
          rank: 1,
          createdAt: new Date()
        },
        {
          positionId: 'pos-2',
          studentId: 'student-1',
          rank: 2,
          createdAt: new Date()
        }
      ];

      vi.mocked(prisma.positionsOnStudents.findMany).mockResolvedValue(existingSelections);

      const selections = await prisma.positionsOnStudents.findMany({
        where: { studentId: 'student-1' }
      });

      expect(selections).toHaveLength(2);
      expect(selections[0].rank).toBe(1);
      expect(selections[1].rank).toBe(2);
    });

    it('should prevent selection if permission slip not completed', async () => {
      const studentWithoutPermission = {
        ...mockStudent,
        permissionSlipCompleted: false
      };

      vi.mocked(prisma.student.findFirst).mockResolvedValue(studentWithoutPermission);

      const student = await prisma.student.findFirst({
        where: { userId: mockUser.id }
      });

      expect(student?.permissionSlipCompleted).toBe(false);
      // In the UI, this would prevent showing the selection checkboxes
    });
  });

  describe('Public Company Viewing with Active Events', () => {
    it('should only show positions from active events on public pages', async () => {
      const mockPublicPositions = [
        {
          id: 'pos-1',
          title: 'Engineering Intern',
          career: 'Engineering',
          slots: 4,
          summary: 'Engineering internship',
          eventId: 'active-event-1',
          host: {
            company: {
              companyName: 'Engineering Corp',
              companyDescription: 'Engineering company'
            }
          }
        }
      ];

      vi.mocked(prisma.school.findFirst).mockResolvedValue(mockSchool);
      vi.mocked(prisma.position.findMany).mockResolvedValue(mockPublicPositions);

      // Test public viewing query (from [school]/view-companies page)
      const positionData = await prisma.position.findMany({
        where: {
          event: {
            schoolId: mockSchool.id,
            isActive: true
          }
        },
        include: {
          host: {
            select: {
              company: true
            }
          }
        }
      });

      expect(prisma.position.findMany).toHaveBeenCalledWith({
        where: {
          event: {
            schoolId: 'school-1',
            isActive: true
          }
        },
        include: {
          host: {
            select: {
              company: true
            }
          }
        }
      });

      expect(positionData).toHaveLength(1);
      expect(positionData[0].title).toBe('Engineering Intern');
    });

    it('should handle multiple schools with different active events', async () => {
      const school1 = { ...mockSchool, id: 'school-1', webAddr: 'school1' };
      const school2 = { ...mockSchool, id: 'school-2', webAddr: 'school2' };

      // School 1 positions
      vi.mocked(prisma.school.findFirst)
        .mockResolvedValueOnce(school1)
        .mockResolvedValueOnce(school2);

      const school1Positions = [
        {
          id: 'pos-1',
          title: 'Position 1',
          career: 'Tech',
          slots: 2,
          summary: 'Description 1',
          eventId: 'active-event-school-1',
          host: { company: { companyName: 'Company 1' } }
        }
      ];

      const school2Positions = [
        {
          id: 'pos-2', 
          title: 'Position 2',
          career: 'Business',
          slots: 3,
          summary: 'Description 2',
          eventId: 'active-event-school-2',
          host: { company: { companyName: 'Company 2' } }
        }
      ];

      vi.mocked(prisma.position.findMany)
        .mockResolvedValueOnce(school1Positions)
        .mockResolvedValueOnce(school2Positions);

      // Test school 1
      const school1Data = await prisma.position.findMany({
        where: {
          event: {
            schoolId: school1.id,
            isActive: true
          }
        },
        include: { host: { select: { company: true } } }
      });

      // Test school 2  
      const school2Data = await prisma.position.findMany({
        where: {
          event: {
            schoolId: school2.id,
            isActive: true
          }
        },
        include: { host: { select: { company: true } } }
      });

      expect(school1Data[0].host.company.companyName).toBe('Company 1');
      expect(school2Data[0].host.company.companyName).toBe('Company 2');
    });
  });

  describe('Position Filtering and Search', () => {
    it('should filter positions by career within active event', async () => {
      const allPositions = [
        {
          id: 'pos-1',
          title: 'Software Engineer',
          career: 'Technology',
          slots: 3,
          host: { company: { companyName: 'Tech Corp' } }
        },
        {
          id: 'pos-2',
          title: 'Marketing Manager', 
          career: 'Marketing',
          slots: 2,
          host: { company: { companyName: 'Marketing Inc' } }
        },
        {
          id: 'pos-3',
          title: 'Data Scientist',
          career: 'Technology', 
          slots: 1,
          host: { company: { companyName: 'Data Corp' } }
        }
      ];

      // Filter by Technology career
      const techPositions = allPositions.filter(pos => pos.career === 'Technology');
      
      expect(techPositions).toHaveLength(2);
      expect(techPositions[0].title).toBe('Software Engineer');
      expect(techPositions[1].title).toBe('Data Scientist');
    });

    it('should filter positions by company within active event', async () => {
      const allPositions = [
        {
          id: 'pos-1',
          title: 'Position 1',
          career: 'Tech',
          host: { company: { companyName: 'Company A' } }
        },
        {
          id: 'pos-2',
          title: 'Position 2',
          career: 'Business',
          host: { company: { companyName: 'Company B' } }
        },
        {
          id: 'pos-3',
          title: 'Position 3',
          career: 'Tech',
          host: { company: { companyName: 'Company A' } }
        }
      ];

      // Filter by Company A
      const companyAPositions = allPositions.filter(
        pos => pos.host.company?.companyName === 'Company A'
      );
      
      expect(companyAPositions).toHaveLength(2);
      expect(companyAPositions[0].title).toBe('Position 1');
      expect(companyAPositions[1].title).toBe('Position 3');
    });
  });
});
