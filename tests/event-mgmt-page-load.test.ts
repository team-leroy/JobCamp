import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redirect } from '@sveltejs/kit';

// Mock dependencies
vi.mock('@sveltejs/kit', () => ({
  redirect: vi.fn((status: number, location: string) => {
    const error = new Error(`Redirect to ${location}`);
    (error as any).status = status;
    (error as any).location = location;
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

describe('Event Management Page Load Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return userRole for full admin users', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'admin@school.edu',
      emailVerified: true,
      role: 'FULL_ADMIN' as const,
      host: null
    };

    const mockUserInfo = {
      id: 'user-1',
      email: 'admin@school.edu',
      role: 'FULL_ADMIN' as const,
      adminOfSchools: [
        { id: 'school-1', name: 'Test School' }
      ]
    };

    const mockLocals = { user: mockUser };

    // Mock the database queries
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUserInfo as any);
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    vi.mocked(prisma.school.findMany).mockResolvedValue([
      { id: 'school-1', name: 'Test School' }
    ] as any);
    vi.mocked(getSchoolEvents).mockResolvedValue([]);
    vi.mocked(prisma.event.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.importantDate.findMany).mockResolvedValue([]);
    vi.mocked(canAccessFullAdminFeatures).mockReturnValue(true);
    vi.mocked(isFullAdmin).mockReturnValue(true);

    // Import the load function dynamically to ensure mocks are in place
    const { load } = await import('../src/routes/dashboard/admin/event-mgmt/+page.server');

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
    const mockUser = {
      id: 'user-2',
      email: 'readonly@school.edu',
      emailVerified: true,
      role: 'READ_ONLY_ADMIN' as const,
      host: null
    };

    const mockUserInfo = {
      id: 'user-2',
      email: 'readonly@school.edu',
      role: 'READ_ONLY_ADMIN' as const,
      adminOfSchools: [
        { id: 'school-1', name: 'Test School' }
      ]
    };

    const mockLocals = { user: mockUser };

    // Mock the database queries
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUserInfo as any);
    vi.mocked(canAccessFullAdminFeatures).mockReturnValue(false);
    
    // Import the load function
    const { load } = await import('../src/routes/dashboard/admin/event-mgmt/+page.server');

    // Should redirect read-only admins away from event management
    await expect(load({ locals: mockLocals } as any)).rejects.toThrow('Redirect to /dashboard');
  });

  it('should redirect non-admin users', async () => {
    const mockUser = {
      id: 'user-3',
      email: 'student@school.edu',
      emailVerified: true,
      role: null,
      host: null
    };

    const mockUserInfo = {
      id: 'user-3',
      email: 'student@school.edu',
      role: null,
      adminOfSchools: [] // Not an admin
    };

    const mockLocals = { user: mockUser };

    // Mock the database queries
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUserInfo as any);

    // Import the load function
    const { load } = await import('../src/routes/dashboard/admin/event-mgmt/+page.server');

    // Should redirect non-admins
    await expect(load({ locals: mockLocals } as any)).rejects.toThrow('Redirect to /dashboard');
  });

  it('should redirect unauthenticated users to login', async () => {
    const mockLocals = { user: null };

    // Import the load function
    const { load } = await import('../src/routes/dashboard/admin/event-mgmt/+page.server');

    // Should redirect to login
    await expect(load({ locals: mockLocals } as any)).rejects.toThrow('Redirect to /login');
  });
});

