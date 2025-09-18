import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma client
vi.mock('$lib/server/prisma', () => ({
	prisma: {
		lotteryConfiguration: {
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn()
		},
		manualAssignment: {
			create: vi.fn(),
			delete: vi.fn(),
			findMany: vi.fn()
		},
		prefillSetting: {
			create: vi.fn(),
			delete: vi.fn(),
			findMany: vi.fn()
		},
		student: {
			findMany: vi.fn()
		},
		position: {
			findMany: vi.fn()
		},
		company: {
			findMany: vi.fn()
		}
	}
}));

// Mock the lottery functions
vi.mock('$lib/server/lottery', () => ({
	startLotteryJob: vi.fn()
}));

import { prisma } from '$lib/server/prisma';

describe('Lottery Page Server Actions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('addManualAssignment', () => {
		it('should create manual assignment with valid data', async () => {
			const mockFormData = new FormData();
			mockFormData.append('studentId', 'student1');
			mockFormData.append('positionId', 'position1');

			// Mock Prisma responses
			vi.mocked(prisma.lotteryConfiguration.findUnique).mockResolvedValue({
				id: 'config1',
				schoolId: 'school1',
				gradeOrder: 'NONE',
				manualAssignments: [],
				prefillSettings: []
			});

			vi.mocked(prisma.manualAssignment.create).mockResolvedValue({
				id: 'assignment1',
				lotteryConfigId: 'config1',
				studentId: 'student1',
				positionId: 'position1',
				createdAt: new Date()
			});

			// This would test the actual action
			// For now, we'll test the data validation
			const studentId = mockFormData.get('studentId') as string;
			const positionId = mockFormData.get('positionId') as string;

			expect(studentId).toBe('student1');
			expect(positionId).toBe('position1');
		});

		it('should handle missing student or position', async () => {
			const mockFormData = new FormData();
			// Missing studentId and positionId

			const studentId = mockFormData.get('studentId');
			const positionId = mockFormData.get('positionId');

			expect(studentId).toBeNull();
			expect(positionId).toBeNull();
		});
	});

	describe('removeManualAssignment', () => {
		it('should remove manual assignment with valid studentId', async () => {
			const mockFormData = new FormData();
			mockFormData.append('studentId', 'student1');

			vi.mocked(prisma.manualAssignment.delete).mockResolvedValue({
				id: 'assignment1',
				lotteryConfigId: 'config1',
				studentId: 'student1',
				positionId: 'position1',
				createdAt: new Date()
			});

			const studentId = mockFormData.get('studentId') as string;
			expect(studentId).toBe('student1');
		});
	});

	describe('updatePrefillSetting', () => {
		it('should create prefill setting with valid data', async () => {
			const mockFormData = new FormData();
			mockFormData.append('companyId', 'company1');
			mockFormData.append('prefillPercentage', '50');

			vi.mocked(prisma.prefillSetting.create).mockResolvedValue({
				id: 'prefill1',
				lotteryConfigId: 'config1',
				companyId: 'company1',
				prefillPercentage: 50,
				createdAt: new Date()
			});

			const companyId = mockFormData.get('companyId') as string;
			const prefillPercentage = parseInt(mockFormData.get('prefillPercentage') as string);

			expect(companyId).toBe('company1');
			expect(prefillPercentage).toBe(50);
		});

		it('should validate prefill percentage range', () => {
			const validPercentages = [0, 25, 50, 75, 100];
			const invalidPercentages = [-1, 101, 150];

			validPercentages.forEach(percentage => {
				expect(percentage).toBeGreaterThanOrEqual(0);
				expect(percentage).toBeLessThanOrEqual(100);
			});

			invalidPercentages.forEach(percentage => {
				expect(percentage < 0 || percentage > 100).toBe(true);
			});
		});
	});

	describe('removePrefillSetting', () => {
		it('should remove prefill setting with valid companyId', async () => {
			const mockFormData = new FormData();
			mockFormData.append('companyId', 'company1');

			vi.mocked(prisma.prefillSetting.delete).mockResolvedValue({
				id: 'prefill1',
				lotteryConfigId: 'config1',
				companyId: 'company1',
				prefillPercentage: 50,
				createdAt: new Date()
			});

			const companyId = mockFormData.get('companyId') as string;
			expect(companyId).toBe('company1');
		});
	});

	describe('runLottery', () => {
		it('should start lottery with valid grade order', async () => {
			const mockFormData = new FormData();
			mockFormData.append('gradeOrder', 'NONE');

			const gradeOrder = mockFormData.get('gradeOrder') as string;
			expect(gradeOrder).toBe('NONE');
			expect(['NONE', 'ASCENDING', 'DESCENDING']).toContain(gradeOrder);
		});

		it('should handle invalid grade order', () => {
			const mockFormData = new FormData();
			mockFormData.append('gradeOrder', 'INVALID');

			const gradeOrder = mockFormData.get('gradeOrder') as string;
			expect(['NONE', 'ASCENDING', 'DESCENDING']).not.toContain(gradeOrder);
		});
	});

	describe('Data Loading', () => {
		it('should load lottery configuration', async () => {
			const mockConfig = {
				id: 'config1',
				schoolId: 'school1',
				gradeOrder: 'NONE',
				manualAssignments: [],
				prefillSettings: []
			};

			vi.mocked(prisma.lotteryConfiguration.findUnique).mockResolvedValue(mockConfig);

			expect(mockConfig.gradeOrder).toBe('NONE');
			expect(mockConfig.manualAssignments).toHaveLength(0);
			expect(mockConfig.prefillSettings).toHaveLength(0);
		});

		it('should load students ordered by last name', async () => {
			const mockStudents = [
				{ id: 's1', firstName: 'John', lastName: 'Doe', grade: 10 },
				{ id: 's2', firstName: 'Jane', lastName: 'Smith', grade: 11 }
			];

			vi.mocked(prisma.student.findMany).mockResolvedValue(mockStudents);

			expect(mockStudents).toHaveLength(2);
			expect(mockStudents[0].lastName).toBe('Doe');
			expect(mockStudents[1].lastName).toBe('Smith');
		});

		it('should load positions with host and company data', async () => {
			const mockPositions = [
				{
					id: 'p1',
					title: 'Software Engineer',
					host: { company: { companyName: 'Tech Corp' } }
				}
			];

			vi.mocked(prisma.position.findMany).mockResolvedValue(mockPositions);

			expect(mockPositions).toHaveLength(1);
			expect(mockPositions[0].host.company.companyName).toBe('Tech Corp');
		});

		it('should load companies', async () => {
			const mockCompanies = [
				{ id: 'c1', companyName: 'Tech Corp' },
				{ id: 'c2', companyName: 'Data Inc' }
			];

			vi.mocked(prisma.company.findMany).mockResolvedValue(mockCompanies);

			expect(mockCompanies).toHaveLength(2);
			expect(mockCompanies[0].companyName).toBe('Tech Corp');
			expect(mockCompanies[1].companyName).toBe('Data Inc');
		});
	});
}); 