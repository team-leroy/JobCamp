import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Prisma client for tests
vi.mock('$lib/server/prisma', () => ({
	prisma: {
		user: {
			findUnique: vi.fn(),
			findFirst: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn()
		},
		student: {
			findMany: vi.fn(),
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn()
		},
		position: {
			findMany: vi.fn(),
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn()
		},
		company: {
			findMany: vi.fn(),
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn()
		},
		lotteryJob: {
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn()
		},
		lotteryConfiguration: {
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			upsert: vi.fn()
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
		lotteryResults: {
			createMany: vi.fn(),
			findMany: vi.fn()
		}
	}
}));

// Mock environment variables
vi.mock('$env/dynamic/public', () => ({
	env: {
		PUBLIC_APP_URL: 'http://localhost:3000'
	}
})); 