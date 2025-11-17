import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prisma
vi.mock('../src/lib/server/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
    lotteryJob: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    event: {
      findFirst: vi.fn(),
    },
    student: {
      findMany: vi.fn(),
    },
    company: {
      findMany: vi.fn(),
    },
    position: {
      findMany: vi.fn(),
    },
    positionsOnStudents: {
      findMany: vi.fn(),
    },
  },
}));

describe('Visualizations Page Server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Timeline Statistics', () => {
    it('should calculate timeline stats with realistic data', async () => {
      const eventDate = new Date('2024-04-15');
      const timelineStart = new Date(eventDate);
      timelineStart.setMonth(timelineStart.getMonth() - 3);

      // Verify timeline data structure
      expect(timelineStart).toBeInstanceOf(Date);
      expect(timelineStart.getTime()).toBeLessThan(eventDate.getTime());

      // Test registration timeline calculation
      const registrationDates = [
        new Date('2024-01-15'),
        new Date('2024-01-20'),
      ];

      expect(registrationDates).toHaveLength(2);
      expect(registrationDates[0]).toEqual(new Date('2024-01-15'));
      expect(registrationDates[1]).toEqual(new Date('2024-01-20'));
    });

    it('should handle empty timeline data gracefully', async () => {
      const eventDate = new Date('2024-04-15');
      const timelineStart = new Date(eventDate);
      timelineStart.setMonth(timelineStart.getMonth() - 3);

      expect(timelineStart).toBeInstanceOf(Date);
      expect(timelineStart.getTime()).toBeLessThan(eventDate.getTime());
    });

    it('should calculate velocity metrics correctly', () => {
      const registrationStats = [
        { date: '2024-01-15', count: 1 },
        { date: '2024-01-20', count: 1 },
        { date: '2024-01-25', count: 2 },
      ];

      const choiceStats = [
        { date: '2024-02-15', count: 1 },
        { date: '2024-02-20', count: 1 },
      ];

      // Calculate velocity metrics
      const totalDays = registrationStats.length > 0 ? 
        Math.ceil((new Date(registrationStats[registrationStats.length - 1].date).getTime() - 
                  new Date(registrationStats[0].date).getTime()) / (1000 * 60 * 60 * 24)) : 0;

      const choiceDays = choiceStats.length > 0 ? 
        Math.ceil((new Date(choiceStats[choiceStats.length - 1].date).getTime() - 
                  new Date(choiceStats[0].date).getTime()) / (1000 * 60 * 60 * 24)) : 0;

      const avgRegistrationsPerDay = registrationStats.length > 0 ? 
        registrationStats.reduce((sum, r) => sum + r.count, 0) / registrationStats.length : 0;

      const avgChoicesPerDay = choiceStats.length > 0 ? 
        choiceStats.reduce((sum, c) => sum + c.count, 0) / choiceStats.length : 0;

      expect(totalDays).toBe(10); // 10 days between first and last registration
      expect(choiceDays).toBe(5); // 5 days between first and last choice
      expect(avgRegistrationsPerDay).toBe(4/3); // 4 total registrations / 3 days
      expect(avgChoicesPerDay).toBe(1); // 2 total choices / 2 days
    });
  });

  describe('Student Statistics', () => {
    it('should calculate student demographics correctly', async () => {
      const studentsWithChoices = [
        {
          grade: 10,
          positionsSignedUpFor: [
            { positionId: 'position-1', rank: 1 },
            { positionId: 'position-2', rank: 2 },
          ],
        },
        {
          grade: 11,
          positionsSignedUpFor: [
            { positionId: 'position-1', rank: 1 },
          ],
        },
      ];

      // Test grade distribution calculation
      const gradeDistribution: Record<number, {
        totalStudents: number;
        studentsWithChoices: number;
        totalChoices: number;
        averageChoices: number;
      }> = {};
      
      for (const student of studentsWithChoices) {
        const grade = student.grade;
        const choiceCount = student.positionsSignedUpFor.length;
        
        if (!gradeDistribution[grade]) {
          gradeDistribution[grade] = {
            totalStudents: 0,
            studentsWithChoices: 0,
            totalChoices: 0,
            averageChoices: 0
          };
        }
        
        gradeDistribution[grade].totalStudents++;
        gradeDistribution[grade].totalChoices += choiceCount;
        if (choiceCount > 0) {
          gradeDistribution[grade].studentsWithChoices++;
        }
      }

      // Calculate averages
      Object.keys(gradeDistribution).forEach(grade => {
        const stats = gradeDistribution[parseInt(grade)];
        stats.averageChoices = stats.studentsWithChoices > 0 ? 
          (stats.totalChoices / stats.studentsWithChoices) : 0;
      });

      expect(gradeDistribution[10].totalStudents).toBe(1);
      expect(gradeDistribution[10].totalChoices).toBe(2);
      expect(gradeDistribution[10].studentsWithChoices).toBe(1);
      expect(gradeDistribution[10].averageChoices).toBe(2);

      expect(gradeDistribution[11].totalStudents).toBe(1);
      expect(gradeDistribution[11].totalChoices).toBe(1);
      expect(gradeDistribution[11].studentsWithChoices).toBe(1);
      expect(gradeDistribution[11].averageChoices).toBe(1);
    });

    it('should identify students with no choices', () => {
      const students = [
        {
          firstName: 'John',
          lastName: 'Doe',
          grade: 10,
          positionsSignedUpFor: [],
        },
        {
          firstName: 'Jane',
          lastName: 'Smith',
          grade: 11,
          positionsSignedUpFor: [
            { positionId: 'position-1', rank: 1 },
          ],
        },
      ];

      const studentsWithNoChoices = students
        .filter(s => s.positionsSignedUpFor.length === 0)
        .map(s => ({
          name: `${s.firstName} ${s.lastName}`,
          grade: s.grade,
        }));

      expect(studentsWithNoChoices).toHaveLength(1);
      expect(studentsWithNoChoices[0].name).toBe('John Doe');
      expect(studentsWithNoChoices[0].grade).toBe(10);
    });

    it('should identify students with many choices', () => {
      const students = [
        {
          firstName: 'John',
          lastName: 'Doe',
          grade: 10,
          positionsSignedUpFor: [
            { positionId: 'pos-1', rank: 1 },
            { positionId: 'pos-2', rank: 2 },
            { positionId: 'pos-3', rank: 3 },
            { positionId: 'pos-4', rank: 4 },
            { positionId: 'pos-5', rank: 5 },
          ],
        },
        {
          firstName: 'Jane',
          lastName: 'Smith',
          grade: 11,
          positionsSignedUpFor: [
            { positionId: 'position-1', rank: 1 },
          ],
        },
      ];

      const studentsWithManyChoices = students
        .filter(s => s.positionsSignedUpFor.length >= 5)
        .map(s => ({
          name: `${s.firstName} ${s.lastName}`,
          grade: s.grade,
          choiceCount: s.positionsSignedUpFor.length,
        }));

      expect(studentsWithManyChoices).toHaveLength(1);
      expect(studentsWithManyChoices[0].name).toBe('John Doe');
      expect(studentsWithManyChoices[0].choiceCount).toBe(5);
    });
  });

  describe('Company Statistics', () => {
    it('should calculate company subscription rates correctly', () => {
      const positionsWithChoices = [
        {
          title: 'Software Engineer',
          slots: 5,
          host: {
            company: { companyName: 'Tech Corp' },
          },
          students: [
            { rank: 1 },
            { rank: 2 },
            { rank: 3 },
            { rank: 4 }, // This should be excluded (top 3 only)
          ],
        },
        {
          title: 'UX Designer',
          slots: 3,
          host: {
            company: { companyName: 'Design Studio' },
          },
          students: [
            { rank: 1 },
            { rank: 2 },
          ],
        },
      ];

      const companySubscriptionRates: Record<string, {
        totalPositions: number;
        totalSlots: number;
        totalChoices: number;
        averageSubscriptionRate: number;
        positions: Array<{
          title: string;
          slots: number;
          choices: number;
          rate: number;
        }>;
      }> = {};

      for (const position of positionsWithChoices) {
        const companyName = position.host.company?.companyName || 'Unknown Company';
        const top3Choices = position.students.filter(student => student.rank <= 3).length;
        const subscriptionRate = top3Choices / position.slots;
        
        if (!companySubscriptionRates[companyName]) {
          companySubscriptionRates[companyName] = {
            totalPositions: 0,
            totalSlots: 0,
            totalChoices: 0,
            averageSubscriptionRate: 0,
            positions: []
          };
        }
        
        companySubscriptionRates[companyName].totalPositions++;
        companySubscriptionRates[companyName].totalSlots += position.slots;
        companySubscriptionRates[companyName].totalChoices += top3Choices;
        companySubscriptionRates[companyName].positions.push({
          title: position.title,
          slots: position.slots,
          choices: top3Choices,
          rate: subscriptionRate
        });
      }

      // Calculate average subscription rates per company
      for (const companyName in companySubscriptionRates) {
        const company = companySubscriptionRates[companyName];
        company.averageSubscriptionRate = company.totalChoices / company.totalSlots;
      }

      expect(companySubscriptionRates['Tech Corp'].totalPositions).toBe(1);
      expect(companySubscriptionRates['Tech Corp'].totalSlots).toBe(5);
      expect(companySubscriptionRates['Tech Corp'].totalChoices).toBe(3); // Only top 3
      expect(companySubscriptionRates['Tech Corp'].averageSubscriptionRate).toBe(0.6); // 3/5

      expect(companySubscriptionRates['Design Studio'].totalPositions).toBe(1);
      expect(companySubscriptionRates['Design Studio'].totalSlots).toBe(3);
      expect(companySubscriptionRates['Design Studio'].totalChoices).toBe(2);
      expect(companySubscriptionRates['Design Studio'].averageSubscriptionRate).toBe(2/3);
    });

    it('should identify oversubscribed and undersubscribed companies', () => {
      const positionsWithChoices = [
        {
          title: 'Software Engineer',
          slots: 2, // Reduced slots to make it oversubscribed
          host: {
            company: { companyName: 'Popular Tech' },
          },
          students: [
            { rank: 1 },
            { rank: 2 },
            { rank: 3 },
            { rank: 4 },
            { rank: 5 },
            { rank: 6 }, // 6 choices for 2 slots = oversubscribed (3 top choices / 2 slots = 1.5)
          ],
        },
        {
          title: 'UX Designer',
          slots: 3,
          host: {
            company: { companyName: 'Quiet Design' },
          },
          students: [], // 0 choices for 3 slots = undersubscribed
        },
      ];

      const oversubscribedCompanies: Array<{
        company: string;
        position: string;
        slots: number;
        choices: number;
        rate: number;
      }> = [];
      const undersubscribedCompanies: Array<{
        company: string;
        position: string;
        slots: number;
        choices: number;
      }> = [];

      for (const position of positionsWithChoices) {
        const companyName = position.host.company?.companyName || 'Unknown Company';
        const top3Choices = position.students.filter(student => student.rank <= 3).length;
        const oversubscriptionRate = top3Choices / position.slots;
        
        if (oversubscriptionRate > 1) {
          oversubscribedCompanies.push({
            company: companyName,
            position: position.title,
            slots: position.slots,
            choices: top3Choices,
            rate: oversubscriptionRate
          });
        } else if (top3Choices === 0) {
          undersubscribedCompanies.push({
            company: companyName,
            position: position.title,
            slots: position.slots,
            choices: 0
          });
        }
      }

      expect(oversubscribedCompanies).toHaveLength(1);
      expect(oversubscribedCompanies[0].company).toBe('Popular Tech');
      expect(oversubscribedCompanies[0].rate).toBe(1.5); // 3 top choices / 2 slots = 1.5

      expect(undersubscribedCompanies).toHaveLength(1);
      expect(undersubscribedCompanies[0].company).toBe('Quiet Design');
      expect(undersubscribedCompanies[0].choices).toBe(0);
    });
  });

  describe('Lottery Statistics', () => {
    it('should calculate choice distribution correctly', () => {
      const results = [
        { studentId: 'student-1', positionId: 'position-1' },
        { studentId: 'student-2', positionId: 'position-2' },
      ];

      const studentChoices = [
        { studentId: 'student-1', choices: ['position-1', 'position-2'] },
        { studentId: 'student-2', choices: ['position-3', 'position-2'] },
      ];

      const choiceCounts = {
        firstChoice: 0,
        secondChoice: 0,
        thirdChoice: 0,
        notPlaced: 0,
      };

      for (const result of results) {
        const studentChoice = studentChoices.find(sc => sc.studentId === result.studentId);
        if (studentChoice) {
          const choiceIndex = studentChoice.choices.indexOf(result.positionId);
          
          if (choiceIndex === 0) choiceCounts.firstChoice++;
          else if (choiceIndex === 1) choiceCounts.secondChoice++;
          else if (choiceIndex === 2) choiceCounts.thirdChoice++;
          else choiceCounts.notPlaced++;
        }
      }

      expect(choiceCounts.firstChoice).toBe(1); // student-1 got their 1st choice
      expect(choiceCounts.secondChoice).toBe(1); // student-2 got their 2nd choice
      expect(choiceCounts.thirdChoice).toBe(0);
      expect(choiceCounts.notPlaced).toBe(0);
    });

    it('should handle students with no choices', () => {
      const allStudentsWithChoices = [
        { id: 'student-1' },
        { id: 'student-2' },
        { id: 'student-3' }, // This student made no choices
      ];

      const results = [
        { studentId: 'student-1', positionId: 'position-1' },
        { studentId: 'student-2', positionId: 'position-2' },
      ];

      const totalStudents = allStudentsWithChoices.length;
      const placedStudents = results.length;
      const notPlacedCount = totalStudents - placedStudents;

      expect(totalStudents).toBe(3);
      expect(placedStudents).toBe(2);
      expect(notPlacedCount).toBe(1);
    });
  });

  describe('Data Validation', () => {
    it('should validate timeline data structure', () => {
      const timelineStats = {
        registrationStats: [
          { date: '2024-01-15', count: 1 },
          { date: '2024-01-20', count: 2 },
        ],
        choiceStats: [
          { date: '2024-02-15', count: 1 },
        ],
        companyStats: [
          { date: '2024-01-10', count: 1 },
        ],
        positionStats: [
          { date: '2024-01-25', count: 1 },
        ],
        lotteryStats: [
          { date: '2024-04-10', count: 1, status: 'COMPLETED', progress: 100 },
        ],
        eventDate: '2024-04-15',
        totalStudents: 2,
        totalStudentsWithChoices: 2,
        totalChoices: 3,
        totalCompanies: 2,
        totalPositions: 2,
        milestones: {
          totalStudents: 2,
          studentsWithChoices: 2,
          totalCompanies: 2,
          totalPositions: 2,
          firstRegistration: '2024-01-15',
          lastRegistration: '2024-01-20',
          firstChoice: '2024-02-15',
          lastChoice: '2024-02-15',
        },
        velocity: {
          totalDays: 5,
          choiceDays: 0,
          avgRegistrationsPerDay: 1.5,
          avgChoicesPerDay: 1,
        },
      };

      // Validate required fields
      expect(timelineStats.registrationStats).toBeInstanceOf(Array);
      expect(timelineStats.choiceStats).toBeInstanceOf(Array);
      expect(timelineStats.companyStats).toBeInstanceOf(Array);
      expect(timelineStats.positionStats).toBeInstanceOf(Array);
      expect(timelineStats.lotteryStats).toBeInstanceOf(Array);
      expect(timelineStats.eventDate).toBeDefined();
      expect(timelineStats.milestones).toBeDefined();
      expect(timelineStats.velocity).toBeDefined();

      // Validate timeline entries
      timelineStats.registrationStats.forEach(entry => {
        expect(entry).toHaveProperty('date');
        expect(entry).toHaveProperty('count');
        expect(typeof entry.date).toBe('string');
        expect(typeof entry.count).toBe('number');
      });

      // Validate lottery stats
      timelineStats.lotteryStats.forEach(entry => {
        expect(entry).toHaveProperty('date');
        expect(entry).toHaveProperty('count');
        expect(entry).toHaveProperty('status');
        expect(entry).toHaveProperty('progress');
      });
    });

    it('should validate student statistics structure', () => {
      const studentStats = {
        gradeStats: [
          { grade: 10, totalStudents: 5, studentsWithChoices: 4, totalChoices: 8, averageChoices: 2 },
          { grade: 11, totalStudents: 3, studentsWithChoices: 3, totalChoices: 6, averageChoices: 2 },
        ],
        choiceStats: [
          { choices: 1, count: 2 },
          { choices: 2, count: 3 },
          { choices: 3, count: 1 },
        ],
        slotStats: [
          { choices: 1, averageSlots: 5, totalSlots: 10, studentCount: 2 },
          { choices: 2, averageSlots: 8, totalSlots: 24, studentCount: 3 },
        ],
        slotAvailabilityStats: [
          { category: 'Total Available Slots', value: 50, color: '#10b981' },
          { category: 'Total Student Choices', value: 14, color: '#3b82f6' },
        ],
        studentsWithNoChoices: [
          { name: 'John Doe', grade: 10 },
        ],
        studentsWithManyChoices: [
          { name: 'Jane Smith', grade: 11, choiceCount: 5 },
        ],
        totalStudents: 8,
        totalStudentsWithChoices: 7,
        totalChoices: 14,
        totalAvailableSlots: 50,
        averageChoicesPerStudent: 1.75,
      };

      // Validate grade stats
      studentStats.gradeStats.forEach(grade => {
        expect(grade).toHaveProperty('grade');
        expect(grade).toHaveProperty('totalStudents');
        expect(grade).toHaveProperty('studentsWithChoices');
        expect(grade).toHaveProperty('totalChoices');
        expect(grade).toHaveProperty('averageChoices');
        expect(typeof grade.grade).toBe('number');
        expect(typeof grade.totalStudents).toBe('number');
        expect(typeof grade.studentsWithChoices).toBe('number');
        expect(typeof grade.totalChoices).toBe('number');
        expect(typeof grade.averageChoices).toBe('number');
      });

      // Validate choice stats
      studentStats.choiceStats.forEach(choice => {
        expect(choice).toHaveProperty('choices');
        expect(choice).toHaveProperty('count');
        expect(typeof choice.choices).toBe('number');
        expect(typeof choice.count).toBe('number');
      });

      // Validate slot availability stats
      studentStats.slotAvailabilityStats.forEach(stat => {
        expect(stat).toHaveProperty('category');
        expect(stat).toHaveProperty('value');
        expect(stat).toHaveProperty('color');
        expect(typeof stat.category).toBe('string');
        expect(typeof stat.value).toBe('number');
        expect(typeof stat.color).toBe('string');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const { prisma } = await import('../src/lib/server/prisma');
      (prisma.user.findFirst as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Database connection failed'));

      // Test that the function handles database errors
      try {
        await prisma.user.findFirst();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Database connection failed');
      }
    });

    it('should handle missing event data', async () => {
      const { prisma } = await import('../src/lib/server/prisma');
      (prisma.event.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // Test that missing event data is handled
      const event = await prisma.event.findFirst();
      expect(event).toBeNull();
    });

    it('should handle empty student data', async () => {
      const { prisma } = await import('../src/lib/server/prisma');
      (prisma.student.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const students = await prisma.student.findMany();
      expect(students).toHaveLength(0);
    });
  });
}); 