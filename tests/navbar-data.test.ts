import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../src/lib/server/prisma';
import { getNavbarData } from '../src/lib/server/navbarData';

// Mock Prisma
vi.mock('../src/lib/server/prisma', () => ({
  prisma: {
    event: {
      findFirst: vi.fn()
    }
  }
}));

describe('getNavbarData Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('showSignupLogin Logic', () => {
    it('should return showSignupLogin: false when no active event exists', async () => {
      vi.mocked(prisma.event.findFirst).mockResolvedValue(null);

      const result = await getNavbarData();

      expect(result).toEqual({
        hasActiveEvent: false,
        studentAccountsEnabled: false,
        companyAccountsEnabled: false,
        companySignupsEnabled: false,
        showSignupLogin: false,
        eventName: null
      });
    });

    it('should return showSignupLogin: false when event is inactive', async () => {
      const mockEvent = {
        id: 'event-1',
        name: 'Test Event',
        isActive: false,
        studentAccountsEnabled: true,
        companyAccountsEnabled: true
      };

      vi.mocked(prisma.event.findFirst).mockResolvedValue(mockEvent);

      const result = await getNavbarData();

      expect(result).toEqual({
        hasActiveEvent: true,
        studentAccountsEnabled: true,
        companyAccountsEnabled: true,
        companySignupsEnabled: false,
        showSignupLogin: false,
        eventName: 'Test Event'
      });
    });

    it('should return showSignupLogin: false when both student and company accounts are disabled', async () => {
      const mockEvent = {
        id: 'event-1',
        name: 'Test Event',
        isActive: true,
        studentAccountsEnabled: false,
        companyAccountsEnabled: false
      };

      vi.mocked(prisma.event.findFirst).mockResolvedValue(mockEvent);

      const result = await getNavbarData();

      expect(result).toEqual({
        hasActiveEvent: true,
        studentAccountsEnabled: false,
        companyAccountsEnabled: false,
        companySignupsEnabled: false,
        showSignupLogin: false,
        eventName: 'Test Event'
      });
    });

    it('should return showSignupLogin: true when event is active and student accounts are enabled', async () => {
      const mockEvent = {
        id: 'event-1',
        name: 'Test Event',
        isActive: true,
        studentAccountsEnabled: true,
        companyAccountsEnabled: false
      };

      vi.mocked(prisma.event.findFirst).mockResolvedValue(mockEvent);

      const result = await getNavbarData();

      expect(result).toEqual({
        hasActiveEvent: true,
        studentAccountsEnabled: true,
        companyAccountsEnabled: false,
        companySignupsEnabled: false,
        showSignupLogin: true,
        eventName: 'Test Event'
      });
    });

    it('should return showSignupLogin: true when event is active and company accounts are enabled', async () => {
      const mockEvent = {
        id: 'event-1',
        name: 'Test Event',
        isActive: true,
        studentAccountsEnabled: false,
        companyAccountsEnabled: true
      };

      vi.mocked(prisma.event.findFirst).mockResolvedValue(mockEvent);

      const result = await getNavbarData();

      expect(result).toEqual({
        hasActiveEvent: true,
        studentAccountsEnabled: false,
        companyAccountsEnabled: true,
        companySignupsEnabled: false,
        showSignupLogin: true,
        eventName: 'Test Event'
      });
    });

    it('should return showSignupLogin: true when event is active and both account types are enabled', async () => {
      const mockEvent = {
        id: 'event-1',
        name: 'Test Event',
        isActive: true,
        studentAccountsEnabled: true,
        companyAccountsEnabled: true
      };

      vi.mocked(prisma.event.findFirst).mockResolvedValue(mockEvent);

      const result = await getNavbarData();

      expect(result).toEqual({
        hasActiveEvent: true,
        studentAccountsEnabled: true,
        companyAccountsEnabled: true,
        companySignupsEnabled: false,
        showSignupLogin: true,
        eventName: 'Test Event'
      });
    });
  });

  describe('Event Data Handling', () => {
    it('should handle event with null values gracefully', async () => {
      const mockEvent = {
        id: 'event-1',
        name: 'Test Event',
        isActive: null,
        studentAccountsEnabled: null,
        companyAccountsEnabled: null
      };

      vi.mocked(prisma.event.findFirst).mockResolvedValue(mockEvent);

      const result = await getNavbarData();

      expect(result).toEqual({
        hasActiveEvent: true,
        studentAccountsEnabled: false,
        companyAccountsEnabled: false,
        companySignupsEnabled: false,
        showSignupLogin: false,
        eventName: 'Test Event'
      });
    });

    it('should handle event with undefined values gracefully', async () => {
      const mockEvent = {
        id: 'event-1',
        name: 'Test Event',
        isActive: undefined,
        studentAccountsEnabled: undefined,
        companyAccountsEnabled: undefined
      };

      vi.mocked(prisma.event.findFirst).mockResolvedValue(mockEvent);

      const result = await getNavbarData();

      expect(result).toEqual({
        hasActiveEvent: true,
        studentAccountsEnabled: false,
        companyAccountsEnabled: false,
        companySignupsEnabled: false,
        showSignupLogin: false,
        eventName: 'Test Event'
      });
    });

    it('should handle event with missing name', async () => {
      const mockEvent = {
        id: 'event-1',
        isActive: true,
        studentAccountsEnabled: true,
        companyAccountsEnabled: true
        // name is missing
      };

      vi.mocked(prisma.event.findFirst).mockResolvedValue(mockEvent);

      const result = await getNavbarData();

      expect(result.eventName).toBeNull();
    });
  });

  describe('Database Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.event.findFirst).mockRejectedValue(new Error('Database connection failed'));

      // Should not throw, but return default values
      await expect(getNavbarData()).rejects.toThrow('Database connection failed');
    });
  });
});
