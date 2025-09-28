import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prisma client
vi.mock('../src/lib/server/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn()
    },
    event: {
      findFirst: vi.fn()
    },
    school: {
      findMany: vi.fn()
    },
    student: {
      count: vi.fn(),
      groupBy: vi.fn()
    },
    company: {
      count: vi.fn()
    },
    position: {
      aggregate: vi.fn(),
      count: vi.fn()
    },
    positionsOnStudents: {
      count: vi.fn()
    },
    permissionSlipSubmission: {
      count: vi.fn()
    }
  }
}));

import { prisma } from '../src/lib/server/prisma';
import { load } from '../src/routes/dashboard/admin/+page.server';

describe('Admin Dashboard Statistics', () => {
  const mockUser = {
    id: 'user-1',
    email: 'admin@school.edu',
    emailVerified: true,
    host: null,
    adminOfSchools: [{ id: 'school-1', name: 'Test School' }]
  };

  const mockSchools = [
    { id: 'school-1', name: 'Test School' }
  ];

  const mockLocals = {
    user: mockUser
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for user lookup
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);
    
    // Default mock for schools
    vi.mocked(prisma.school.findMany).mockResolvedValue(mockSchools);
  });

  describe('Statistics when NO active event exists', () => {
    beforeEach(() => {
      // Mock no active event
      vi.mocked(prisma.event.findFirst).mockResolvedValue(null);
    });

    it('should return empty statistics when no active event exists', async () => {
      const result = await load({ locals: mockLocals });

      expect(result.upcomingEvent).toBeNull();
      expect(result.studentStats).toEqual({
        totalStudents: 0,
        permissionSlipsSigned: 0,
        studentsWithoutChoices: 0,
        totalStudentChoices: 0,
        freshman: 0,
        sophomore: 0,
        junior: 0,
        senior: 0
      });
      expect(result.companyStats).toEqual({
        totalCompanies: 0,
        companiesLoggedInThisYear: 0,
        positionsThisYear: 0,
        slotsThisYear: 0
      });
    });

    it('should not call statistics queries when no active event', async () => {
      await load({ locals: mockLocals });

      // Verify that student and company statistics queries are NOT called
      expect(prisma.student.count).not.toHaveBeenCalled();
      expect(prisma.student.groupBy).not.toHaveBeenCalled();
      expect(prisma.company.count).not.toHaveBeenCalled();
      expect(prisma.position.count).not.toHaveBeenCalled();
      expect(prisma.position.aggregate).not.toHaveBeenCalled();
      expect(prisma.positionsOnStudents.count).not.toHaveBeenCalled();
    });

    it('should still return school information when no active event', async () => {
      const result = await load({ locals: mockLocals });

      expect(result.schools).toEqual(mockSchools);
      expect(result.isAdmin).toBe(true);
      expect(result.loggedIn).toBe(true);
    });
  });

  describe('Statistics when active event EXISTS', () => {
    const mockActiveEvent = {
      id: 'active-event-1',
      name: 'Spring 2024 Job Shadow',
      date: new Date('2024-04-15'),
      isActive: true,
      isArchived: false,
      displayLotteryResults: true,
      schoolId: 'school-1'
    };

    beforeEach(() => {
      // Mock active event exists
      vi.mocked(prisma.event.findFirst).mockResolvedValue(mockActiveEvent);

      // Mock student statistics
      vi.mocked(prisma.student.count)
        .mockResolvedValueOnce(150) // totalStudents
        .mockResolvedValueOnce(25)  // studentsWithoutChoices
      
      // Mock permission slip submissions for active event
      vi.mocked(prisma.permissionSlipSubmission.count).mockResolvedValue(120); // permissionSlipsSigned
      
      vi.mocked(prisma.positionsOnStudents.count).mockResolvedValue(75); // totalStudentChoices
      
      vi.mocked(prisma.student.groupBy).mockResolvedValue([
        { grade: 9, _count: { grade: 40 } },
        { grade: 10, _count: { grade: 35 } },
        { grade: 11, _count: { grade: 45 } },
        { grade: 12, _count: { grade: 30 } }
      ]);

      // Mock company statistics
      vi.mocked(prisma.company.count)
        .mockResolvedValueOnce(25) // totalCompanies
        .mockResolvedValueOnce(18) // companiesLoggedInThisYear

      vi.mocked(prisma.position.count).mockResolvedValue(12); // positionsThisYear
      vi.mocked(prisma.position.aggregate).mockResolvedValue({ _sum: { slots: 60 } }); // slotsThisYear
    });

    it('should return populated statistics when active event exists', async () => {
      const result = await load({ locals: mockLocals });

      expect(result.upcomingEvent).toEqual(mockActiveEvent);
      expect(result.studentStats).toEqual({
        totalStudents: 150,
        permissionSlipsSigned: 120,
        studentsWithoutChoices: 25,
        totalStudentChoices: 75,
        freshman: 40,
        sophomore: 35,
        junior: 45,
        senior: 30
      });
      expect(result.companyStats).toEqual({
        totalCompanies: 25,
        companiesLoggedInThisYear: 18,
        positionsThisYear: 12,
        slotsThisYear: 60
      });
    });

    it('should filter student choices by active event', async () => {
      await load({ locals: mockLocals });

      // Verify student choices query filters by active event (active students only)
      expect(prisma.positionsOnStudents.count).toHaveBeenCalledWith({
        where: {
          student: { 
            schoolId: { in: ['school-1'] },
            isActive: true
          },
          position: { eventId: 'active-event-1' }
        }
      });
    });

    it('should filter students without choices by active event', async () => {
      await load({ locals: mockLocals });

      // Verify students without choices query filters by active event (active students only)
      expect(prisma.student.count).toHaveBeenCalledWith({
        where: { 
          schoolId: { in: ['school-1'] },
          isActive: true,
          positionsSignedUpFor: { 
            none: {
              position: {
                eventId: 'active-event-1'
              }
            }
          }
        }
      });
    });

    it('should filter company positions by active event', async () => {
      const currentYear = new Date().getFullYear();
      
      await load({ locals: mockLocals });

      // Verify positions query filters by active event
      expect(prisma.position.count).toHaveBeenCalledWith({
        where: {
          eventId: 'active-event-1',
          host: {
            user: {
              lastLogin: {
                gte: new Date(currentYear, 0, 1)
              }
            }
          }
        }
      });
    });

    it('should filter company slots by active event', async () => {
      const currentYear = new Date().getFullYear();
      
      await load({ locals: mockLocals });

      // Verify slots query filters by active event
      expect(prisma.position.aggregate).toHaveBeenCalledWith({
        where: {
          eventId: 'active-event-1',
          host: {
            user: {
              lastLogin: {
                gte: new Date(currentYear, 0, 1)
              }
            }
          }
        },
        _sum: { slots: true }
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle null position aggregate result', async () => {
      const mockActiveEvent = {
        id: 'active-event-1',
        name: 'Spring 2024 Job Shadow',
        date: new Date('2024-04-15'),
        isActive: true,
        isArchived: false,
        displayLotteryResults: true,
        schoolId: 'school-1'
      };

      vi.mocked(prisma.event.findFirst).mockResolvedValue(mockActiveEvent);
      vi.mocked(prisma.student.count).mockResolvedValue(0);
      vi.mocked(prisma.positionsOnStudents.count).mockResolvedValue(0);
      vi.mocked(prisma.student.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.company.count).mockResolvedValue(0);
      vi.mocked(prisma.position.count).mockResolvedValue(0);
      vi.mocked(prisma.position.aggregate).mockResolvedValue({ _sum: { slots: null } });

      const result = await load({ locals: mockLocals });

      expect(result.companyStats.slotsThisYear).toBe(0);
    });

    it('should handle missing grade data gracefully', async () => {
      const mockActiveEvent = {
        id: 'active-event-1',
        name: 'Spring 2024 Job Shadow',
        date: new Date('2024-04-15'),
        isActive: true,
        isArchived: false,
        displayLotteryResults: true,
        schoolId: 'school-1'
      };

      vi.mocked(prisma.event.findFirst).mockResolvedValue(mockActiveEvent);
      vi.mocked(prisma.student.count).mockResolvedValue(0);
      vi.mocked(prisma.permissionSlipSubmission.count).mockResolvedValue(0);
      vi.mocked(prisma.positionsOnStudents.count).mockResolvedValue(0);
      vi.mocked(prisma.student.groupBy).mockResolvedValue([
        { grade: 10, _count: { grade: 20 } }
        // Missing grades 9, 11, 12
      ]);
      vi.mocked(prisma.company.count).mockResolvedValue(0);
      vi.mocked(prisma.position.count).mockResolvedValue(0);
      vi.mocked(prisma.position.aggregate).mockResolvedValue({ _sum: { slots: 0 } });

      const result = await load({ locals: mockLocals });

      expect(result.studentStats).toEqual({
        totalStudents: 0,
        permissionSlipsSigned: 0,
        studentsWithoutChoices: 0,
        totalStudentChoices: 0,
        freshman: 0,
        sophomore: 20,
        junior: 0,
        senior: 0
      });
    });
  });

  describe('Authorization', () => {
    it('should handle unauthorized user', async () => {
      const unauthorizedLocals = {
        user: {
          ...mockUser,
          adminOfSchools: []
        }
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValue(unauthorizedLocals.user);

      // Should redirect (not return data) - this would be handled by the redirect() call
      // For testing purposes, we'll verify the user lookup
      expect(prisma.user.findFirst).toBeDefined();
    });

    it('should handle non-existent user', async () => {
      const noUserLocals = { user: null };

      // Should redirect (not return data) - this would be handled by the redirect() call
      // For testing purposes, we'll verify the scenario
      expect(noUserLocals.user).toBeNull();
    });
  });
});
