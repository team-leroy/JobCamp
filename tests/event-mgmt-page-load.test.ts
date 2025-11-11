import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@sveltejs/kit', () => ({
  redirect: vi.fn((status: number, location: string) => {
    const error = new Error(`Redirect to ${location}`) as Error & { status: number; location: string };
    error.status = status;
    error.location = location;
    throw error;
  })
}));

vi.mock('../src/lib/server/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findMany: vi.fn()
    },
    school: {
      findMany: vi.fn()
    },
    event: {
      findFirst: vi.fn()
    },
    position: {
      count: vi.fn(),
      aggregate: vi.fn()
    },
    student: {
      count: vi.fn()
    },
    importantDate: {
      findMany: vi.fn()
    }
  }
}));

vi.mock('../src/lib/server/eventManagement', () => ({
  getSchoolEvents: vi.fn(),
  createEvent: vi.fn(),
  activateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  archiveEvent: vi.fn()
}));

vi.mock('../src/lib/server/roleUtils', () => ({
  isFullAdmin: vi.fn(),
  canAccessFullAdminFeatures: vi.fn()
}));

vi.mock('../src/lib/server/auth', () => ({
  hashPassword: vi.fn()
}));

import { prisma } from '../src/lib/server/prisma';
import { getSchoolEvents } from '../src/lib/server/eventManagement';
import { isFullAdmin, canAccessFullAdminFeatures } from '../src/lib/server/roleUtils';

// Type definitions for test data
interface MockUser {
  id: string;
  email: string;
  emailVerified: boolean;
  role: 'FULL_ADMIN' | 'READ_ONLY_ADMIN' | null;
  host: null;
}

interface MockUserInfo extends MockUser {
  adminOfSchools: Array<{ id: string; name: string }>;
}

interface MockSchool {
  id: string;
  name: string;
}

interface MockLocals {
  user: MockUser | null;
}

describe('Event Management Page Load Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return userRole for full admin users', async () => {
    const mockUser: MockUser = {
      id: 'user-1',
      email: 'admin@school.edu',
      emailVerified: true,
      role: 'FULL_ADMIN',
      host: null
    };

    const mockUserInfo: MockUserInfo = {
      id: 'user-1',
      email: 'admin@school.edu',
      emailVerified: true,
      role: 'FULL_ADMIN',
      host: null,
      adminOfSchools: [
        { id: 'school-1', name: 'Test School' }
      ]
    };

    const mockSchools: MockSchool[] = [
      { id: 'school-1', name: 'Test School' }
    ];

    const mockLocals: MockLocals = { user: mockUser };

    // Mock the database queries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUserInfo as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.school.findMany).mockResolvedValue(mockSchools as any);
    vi.mocked(getSchoolEvents).mockResolvedValue([]);
    vi.mocked(prisma.event.findFirst).mockResolvedValue(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.importantDate.findMany).mockResolvedValue([] as any);
    vi.mocked(canAccessFullAdminFeatures).mockReturnValue(true);
    vi.mocked(isFullAdmin).mockReturnValue(true);

    // Import the load function dynamically to ensure mocks are in place
    const { load } = await import('../src/routes/dashboard/admin/event-mgmt/+page.server');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await load({ locals: mockLocals } as any);

    // Critical assertion: userRole must be returned for navbar to work correctly
    expect(result).toHaveProperty('userRole');
    expect(result.userRole).toBe('FULL_ADMIN');
    
    // Also verify other expected properties
    expect(result.isAdmin).toBe(true);
    expect(result.loggedIn).toBe(true);
    expect(result.isHost).toBe(false);
  });

  it('should redirect read-only admin users', async () => {
    const mockUser: MockUser = {
      id: 'user-2',
      email: 'readonly@school.edu',
      emailVerified: true,
      role: 'READ_ONLY_ADMIN',
      host: null
    };

    const mockUserInfo: MockUserInfo = {
      id: 'user-2',
      email: 'readonly@school.edu',
      emailVerified: true,
      role: 'READ_ONLY_ADMIN',
      host: null,
      adminOfSchools: [
        { id: 'school-1', name: 'Test School' }
      ]
    };

    const mockLocals: MockLocals = { user: mockUser };

    // Mock the database queries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUserInfo as any);
    vi.mocked(canAccessFullAdminFeatures).mockReturnValue(false);
    
    // Import the load function
    const { load } = await import('../src/routes/dashboard/admin/event-mgmt/+page.server');

    // Should redirect read-only admins away from event management
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(load({ locals: mockLocals } as any)).rejects.toThrow('Redirect to /dashboard');
  });

  it('should redirect non-admin users', async () => {
    const mockUser: MockUser = {
      id: 'user-3',
      email: 'student@school.edu',
      emailVerified: true,
      role: null,
      host: null
    };

    const mockUserInfo: MockUserInfo = {
      id: 'user-3',
      email: 'student@school.edu',
      emailVerified: true,
      role: null,
      host: null,
      adminOfSchools: [] // Not an admin
    };

    const mockLocals: MockLocals = { user: mockUser };

    // Mock the database queries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUserInfo as any);

    // Import the load function
    const { load } = await import('../src/routes/dashboard/admin/event-mgmt/+page.server');

    // Should redirect non-admins
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(load({ locals: mockLocals } as any)).rejects.toThrow('Redirect to /dashboard');
  });

  it('should redirect unauthenticated users to login', async () => {
    const mockLocals: MockLocals = { user: null };

    // Import the load function
    const { load } = await import('../src/routes/dashboard/admin/event-mgmt/+page.server');

    // Should redirect to login
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(load({ locals: mockLocals } as any)).rejects.toThrow('Redirect to /login');
  });
});

