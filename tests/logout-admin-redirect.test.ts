import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redirect } from '@sveltejs/kit';
import { prisma } from '../src/lib/server/prisma';
import { getNavbarData } from '../src/lib/server/navbarData';

// Mock SvelteKit redirect
vi.mock('@sveltejs/kit', () => ({
  redirect: vi.fn()
}));

// Mock Prisma
vi.mock('../src/lib/server/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn()
    },
    event: {
      findFirst: vi.fn()
    }
  }
}));

// Mock getNavbarData
vi.mock('../src/lib/server/navbarData', () => ({
  getNavbarData: vi.fn()
}));

// Mock Lucia
vi.mock('../src/lib/server/auth', () => ({
  lucia: {
    validateSession: vi.fn(),
    invalidateSession: vi.fn(),
    sessionCookieName: 'session'
  }
}));

// Import the actions and auth after mocking
import { actions } from '../src/routes/dashboard/+page.server';
import { lucia } from '../src/lib/server/auth';

describe('Admin Logout Redirect Logic', () => {
  const mockAdminUser = {
    id: 'admin-1',
    email: 'admin@school.edu',
    emailVerified: true,
    adminOfSchools: [
      { id: 'school-1', name: 'Test School' }
    ]
  };

  const mockNonAdminUser = {
    id: 'user-1',
    email: 'user@school.edu',
    emailVerified: true,
    adminOfSchools: []
  };

  const mockSession = {
    id: 'session-1',
    userId: 'admin-1',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours from now
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful session validation
    vi.mocked(lucia.validateSession).mockResolvedValue({
      session: mockSession,
      user: mockAdminUser
    });
    
    // Mock session invalidation
    vi.mocked(lucia.invalidateSession).mockResolvedValue();
  });

  describe('Admin Logout with Signup/Login Disabled', () => {
    it('should redirect admin to /admin/login when showSignupLogin is false', async () => {
      // Mock user lookup with adminOfSchools
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockAdminUser);
      
      // Mock getNavbarData to return showSignupLogin: false
      vi.mocked(getNavbarData).mockResolvedValue({
        hasActiveEvent: true,
        studentAccountsEnabled: false,
        companyAccountsEnabled: false,
        showSignupLogin: false,
        eventName: 'Test Event'
      });

      const mockLocals = { user: mockAdminUser, session: mockSession };
      const mockCookies = { delete: vi.fn() };

      await actions.logOut({ locals: mockLocals, cookies: mockCookies });

      // Should redirect to /admin/login
      expect(redirect).toHaveBeenCalledWith(302, '/admin/login');
    });

    it('should redirect admin to /admin/login when no active event exists', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockAdminUser);
      
      // Mock getNavbarData to return showSignupLogin: false (no active event)
      vi.mocked(getNavbarData).mockResolvedValue({
        hasActiveEvent: false,
        studentAccountsEnabled: false,
        companyAccountsEnabled: false,
        showSignupLogin: false,
        eventName: null
      });

      const mockLocals = { user: mockAdminUser, session: mockSession };
      const mockCookies = { delete: vi.fn() };

      await actions.logOut({ locals: mockLocals, cookies: mockCookies });

      expect(redirect).toHaveBeenCalledWith(302, '/admin/login');
    });

    it('should redirect admin to /admin/login when event is disabled', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockAdminUser);
      
      // Mock getNavbarData to return showSignupLogin: false (event disabled)
      vi.mocked(getNavbarData).mockResolvedValue({
        hasActiveEvent: true,
        studentAccountsEnabled: true,
        companyAccountsEnabled: true,
        showSignupLogin: false,
        eventName: 'Test Event'
      });

      const mockLocals = { user: mockAdminUser, session: mockSession };
      const mockCookies = { delete: vi.fn() };

      await actions.logOut({ locals: mockLocals, cookies: mockCookies });

      expect(redirect).toHaveBeenCalledWith(302, '/admin/login');
    });
  });

  describe('Admin Logout with Signup/Login Enabled', () => {
    it('should redirect admin to /login when showSignupLogin is true', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockAdminUser);
      
      // Mock getNavbarData to return showSignupLogin: true
      vi.mocked(getNavbarData).mockResolvedValue({
        hasActiveEvent: true,
        studentAccountsEnabled: true,
        companyAccountsEnabled: true,
        showSignupLogin: true,
        eventName: 'Test Event'
      });

      const mockLocals = { user: mockAdminUser, session: mockSession };
      const mockCookies = { delete: vi.fn() };

      await actions.logOut({ locals: mockLocals, cookies: mockCookies });

      // Should redirect to /login (regular login page)
      expect(redirect).toHaveBeenCalledWith(302, '/login');
    });

    it('should redirect admin to /login when only student accounts are enabled', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockAdminUser);
      
      // Mock getNavbarData to return showSignupLogin: true (only students enabled)
      vi.mocked(getNavbarData).mockResolvedValue({
        hasActiveEvent: true,
        studentAccountsEnabled: true,
        companyAccountsEnabled: false,
        showSignupLogin: true,
        eventName: 'Test Event'
      });

      const mockLocals = { user: mockAdminUser, session: mockSession };
      const mockCookies = { delete: vi.fn() };

      await actions.logOut({ locals: mockLocals, cookies: mockCookies });

      expect(redirect).toHaveBeenCalledWith(302, '/login');
    });

    it('should redirect admin to /login when only company accounts are enabled', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockAdminUser);
      
      // Mock getNavbarData to return showSignupLogin: true (only companies enabled)
      vi.mocked(getNavbarData).mockResolvedValue({
        hasActiveEvent: true,
        studentAccountsEnabled: false,
        companyAccountsEnabled: true,
        showSignupLogin: true,
        eventName: 'Test Event'
      });

      const mockLocals = { user: mockAdminUser, session: mockSession };
      const mockCookies = { delete: vi.fn() };

      await actions.logOut({ locals: mockLocals, cookies: mockCookies });

      expect(redirect).toHaveBeenCalledWith(302, '/login');
    });
  });

  describe('Non-Admin Logout', () => {
    it('should redirect non-admin to /login regardless of event controls', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockNonAdminUser);

      const mockLocals = { user: mockNonAdminUser, session: mockSession };
      const mockCookies = { delete: vi.fn() };

      await actions.logOut({ locals: mockLocals, cookies: mockCookies });

      // Non-admins should always go to /login
      expect(redirect).toHaveBeenCalledWith(302, '/login');
      // Should not call getNavbarData for non-admins
      expect(getNavbarData).not.toHaveBeenCalled();
    });

    it('should redirect to /login when user has no adminOfSchools', async () => {
      const userWithNoAdminSchools = {
        ...mockAdminUser,
        adminOfSchools: []
      };
      
      vi.mocked(prisma.user.findFirst).mockResolvedValue(userWithNoAdminSchools);

      const mockLocals = { user: userWithNoAdminSchools, session: mockSession };
      const mockCookies = { delete: vi.fn() };

      await actions.logOut({ locals: mockLocals, cookies: mockCookies });

      expect(redirect).toHaveBeenCalledWith(302, '/login');
      expect(getNavbarData).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle case when user is null', async () => {
      const mockLocals = { user: null, session: mockSession };
      const mockCookies = { delete: vi.fn() };

      await actions.logOut({ locals: mockLocals, cookies: mockCookies });

      expect(redirect).toHaveBeenCalledWith(302, '/login');
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
      expect(getNavbarData).not.toHaveBeenCalled();
    });

    it('should handle case when user lookup fails', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const mockLocals = { user: mockAdminUser, session: mockSession };
      const mockCookies = { delete: vi.fn() };

      await actions.logOut({ locals: mockLocals, cookies: mockCookies });

      expect(redirect).toHaveBeenCalledWith(302, '/login');
    });

    it('should handle case when session validation fails', async () => {
      vi.mocked(lucia.validateSession).mockResolvedValue({
        session: null,
        user: null
      });

      const mockLocals = { user: mockAdminUser, session: mockSession };
      const mockCookies = { delete: vi.fn() };

      // Should not throw error, just redirect to /login
      await expect(actions.logOut({ locals: mockLocals, cookies: mockCookies }))
        .resolves.not.toThrow();
    });
  });

  describe('Session Management', () => {
    it('should invalidate session and delete cookies for valid session', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockAdminUser);
      vi.mocked(getNavbarData).mockResolvedValue({
        hasActiveEvent: true,
        studentAccountsEnabled: true,
        companyAccountsEnabled: true,
        showSignupLogin: true,
        eventName: 'Test Event'
      });

      const mockLocals = { user: mockAdminUser, session: mockSession };
      const mockCookies = { delete: vi.fn() };

      await actions.logOut({ locals: mockLocals, cookies: mockCookies });

      // Should invalidate session
      expect(lucia.invalidateSession).toHaveBeenCalledWith('session-1');
      // Should delete session cookie
      expect(mockCookies.delete).toHaveBeenCalledWith('session', { path: '.' });
    });

    it('should not attempt session invalidation when no session exists', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockAdminUser);
      vi.mocked(getNavbarData).mockResolvedValue({
        hasActiveEvent: true,
        studentAccountsEnabled: true,
        companyAccountsEnabled: true,
        showSignupLogin: true,
        eventName: 'Test Event'
      });

      const mockLocals = { user: mockAdminUser, session: null };
      const mockCookies = { delete: vi.fn() };

      await actions.logOut({ locals: mockLocals, cookies: mockCookies });

      // Should not call session invalidation
      expect(lucia.invalidateSession).not.toHaveBeenCalled();
      expect(mockCookies.delete).not.toHaveBeenCalled();
    });
  });
});
