import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '$lib/server/prisma';

// Mock Prisma
vi.mock('$lib/server/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn()
    },
    event: {
      findFirst: vi.fn(),
      update: vi.fn()
    }
  }
}));

// Mock auth module to avoid Lucia initialization issues
vi.mock('$lib/server/auth', () => ({
  hashPassword: vi.fn().mockResolvedValue({ hash: 'mocked-hash', salt: 'mocked-salt' }),
  verifyPassword: vi.fn().mockResolvedValue(true)
}));

describe('Event Controls Mutual Exclusivity', () => {
  const mockLocals = {
    user: {
      id: 'admin-user-1',
      emailVerified: true,
      host: null
    }
  };

  const mockUserInfo = {
    id: 'admin-user-1',
    role: 'FULL_ADMIN' as const,
    adminOfSchools: [{ id: 'school-1' }]
  };

  const mockActiveEvent = {
    id: 'active-event-1',
    schoolId: 'school-1',
    isActive: true,
    studentAccountsEnabled: true,
    companyAccountsEnabled: true,
    studentSignupsEnabled: false,
    lotteryPublished: false,
    companySignupsEnabled: false,
    companyDirectoryEnabled: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock user lookup
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUserInfo);
    
    // Mock active event lookup
    vi.mocked(prisma.event.findFirst).mockResolvedValue(mockActiveEvent);
    
    // Mock event update
    vi.mocked(prisma.event.update).mockResolvedValue({});
  });

  describe('Student Signups and Lottery Published Scramble Mode', () => {
    it('should allow enabling student signups without disabling lottery published', async () => {
      const actions = await import('../src/routes/dashboard/admin/event-mgmt/+page.server');
      const updateEventControls = actions.actions.updateEventControls;

      const formData = new FormData();
      formData.append('controlType', 'studentSignups');
      formData.append('enabled', 'true');

      const request = {
        formData: () => Promise.resolve(formData)
      } as Request;

      const result = await updateEventControls({ request, locals: mockLocals });

      expect(result.success).toBe(true);
      expect(vi.mocked(prisma.event.update)).toHaveBeenCalledWith({
        where: { id: 'active-event-1' },
        data: {
          studentSignupsEnabled: true
        }
      });
    });

    it('should allow enabling lottery published without disabling student signups', async () => {
      const actions = await import('../src/routes/dashboard/admin/event-mgmt/+page.server');
      const updateEventControls = actions.actions.updateEventControls;

      const formData = new FormData();
      formData.append('controlType', 'lotteryPublished');
      formData.append('enabled', 'true');

      const request = {
        formData: () => Promise.resolve(formData)
      } as Request;

      const result = await updateEventControls({ request, locals: mockLocals });

      expect(result.success).toBe(true);
      expect(vi.mocked(prisma.event.update)).toHaveBeenCalledWith({
        where: { id: 'active-event-1' },
        data: {
          lotteryPublished: true
        }
      });
    });

    it('should not affect other controls when enabling student signups', async () => {
      const actions = await import('../src/routes/dashboard/admin/event-mgmt/+page.server');
      const updateEventControls = actions.actions.updateEventControls;

      const formData = new FormData();
      formData.append('controlType', 'studentSignups');
      formData.append('enabled', 'true');

      const request = {
        formData: () => Promise.resolve(formData)
      } as Request;

      const result = await updateEventControls({ request, locals: mockLocals });

      expect(result.success).toBe(true);
      
      // Verify only studentSignupsEnabled is affected
      const updateCall = vi.mocked(prisma.event.update).mock.calls[0];
      const updateData = updateCall[0].data;
      
      expect(updateData).toEqual({
        studentSignupsEnabled: true
      });
    });

    it('should not affect other controls when enabling lottery published', async () => {
      const actions = await import('../src/routes/dashboard/admin/event-mgmt/+page.server');
      const updateEventControls = actions.actions.updateEventControls;

      const formData = new FormData();
      formData.append('controlType', 'lotteryPublished');
      formData.append('enabled', 'true');

      const request = {
        formData: () => Promise.resolve(formData)
      } as Request;

      const result = await updateEventControls({ request, locals: mockLocals });

      expect(result.success).toBe(true);
      
      // Verify only lotteryPublished is affected
      const updateCall = vi.mocked(prisma.event.update).mock.calls[0];
      const updateData = updateCall[0].data;
      
      expect(updateData).toEqual({
        lotteryPublished: true
      });
    });

    it('should allow disabling student signups without affecting lottery published', async () => {
      const actions = await import('../src/routes/dashboard/admin/event-mgmt/+page.server');
      const updateEventControls = actions.actions.updateEventControls;

      const formData = new FormData();
      formData.append('controlType', 'studentSignups');
      formData.append('enabled', 'false');

      const request = {
        formData: () => Promise.resolve(formData)
      } as Request;

      const result = await updateEventControls({ request, locals: mockLocals });

      expect(result.success).toBe(true);
      expect(vi.mocked(prisma.event.update)).toHaveBeenCalledWith({
        where: { id: 'active-event-1' },
        data: {
          studentSignupsEnabled: false
        }
      });
    });

    it('should allow disabling lottery published without affecting student signups', async () => {
      const actions = await import('../src/routes/dashboard/admin/event-mgmt/+page.server');
      const updateEventControls = actions.actions.updateEventControls;

      const formData = new FormData();
      formData.append('controlType', 'lotteryPublished');
      formData.append('enabled', 'false');

      const request = {
        formData: () => Promise.resolve(formData)
      } as Request;

      const result = await updateEventControls({ request, locals: mockLocals });

      expect(result.success).toBe(true);
      expect(vi.mocked(prisma.event.update)).toHaveBeenCalledWith({
        where: { id: 'active-event-1' },
        data: {
          lotteryPublished: false
        }
      });
    });
  });

  describe('Other Controls Not Affected', () => {
    it('should not affect mutual exclusivity when updating company accounts', async () => {
      const actions = await import('../src/routes/dashboard/admin/event-mgmt/+page.server');
      const updateEventControls = actions.actions.updateEventControls;

      const formData = new FormData();
      formData.append('controlType', 'companyAccounts');
      formData.append('enabled', 'true');

      const request = {
        formData: () => Promise.resolve(formData)
      } as Request;

      const result = await updateEventControls({ request, locals: mockLocals });

      expect(result.success).toBe(true);
      expect(vi.mocked(prisma.event.update)).toHaveBeenCalledWith({
        where: { id: 'active-event-1' },
        data: {
          companyAccountsEnabled: true
        }
      });
    });

    it('should not affect mutual exclusivity when updating student accounts', async () => {
      const actions = await import('../src/routes/dashboard/admin/event-mgmt/+page.server');
      const updateEventControls = actions.actions.updateEventControls;

      const formData = new FormData();
      formData.append('controlType', 'studentAccounts');
      formData.append('enabled', 'true');

      const request = {
        formData: () => Promise.resolve(formData)
      } as Request;

      const result = await updateEventControls({ request, locals: mockLocals });

      expect(result.success).toBe(true);
      expect(vi.mocked(prisma.event.update)).toHaveBeenCalledWith({
        where: { id: 'active-event-1' },
        data: {
          studentAccountsEnabled: true
        }
      });
    });

    it('should not affect mutual exclusivity when updating company directory', async () => {
      const actions = await import('../src/routes/dashboard/admin/event-mgmt/+page.server');
      const updateEventControls = actions.actions.updateEventControls;

      const formData = new FormData();
      formData.append('controlType', 'companyDirectory');
      formData.append('enabled', 'true');

      const request = {
        formData: () => Promise.resolve(formData)
      } as Request;

      const result = await updateEventControls({ request, locals: mockLocals });

      expect(result.success).toBe(true);
      expect(vi.mocked(prisma.event.update)).toHaveBeenCalledWith({
        where: { id: 'active-event-1' },
        data: {
          companyDirectoryEnabled: true
        }
      });
    });
  });
});
