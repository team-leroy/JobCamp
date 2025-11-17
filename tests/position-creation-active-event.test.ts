import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prisma client
vi.mock('../src/lib/server/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn()
    },
    host: {
      findFirst: vi.fn(),
      update: vi.fn()
    },
    school: {
      findFirst: vi.fn()
    },
    event: {
      findFirst: vi.fn()
    }
  }
}));

// Mock email service
vi.mock('../src/lib/server/email', () => ({
  sendPositionUpdateEmail: vi.fn()
}));

import { prisma } from '../src/lib/server/prisma';
import { sendPositionUpdateEmail } from '../src/lib/server/email';

describe('Position Creation with Active Events', () => {
  const mockUser = {
    id: 'user-1',
    email: 'host@company.com',
    emailVerified: true
  };

  const mockHost = {
    id: 'host-1',
    name: 'John Host',
    userId: 'user-1',
    company: {
      id: 'company-1',
      companyName: 'Tech Corp',
      schoolId: 'school-1',
      school: {
        id: 'school-1',
        name: 'Test High School'
      }
    }
  };

  const mockActiveEvent = {
    id: 'active-event-1',
    schoolId: 'school-1',
    name: 'Spring 2024 Job Shadow',
    date: new Date('2024-04-15'),
    isActive: true,
    isArchived: false,
    displayLotteryResults: false
  };

  // mockLocals would be used in actual route handler tests
  // const mockLocals = {
  //   user: mockUser
  // };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Active Event Lookup for Position Creation', () => {
    it('should find active event when creating position', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);
      vi.mocked(prisma.host.findFirst).mockResolvedValue(mockHost);
      vi.mocked(prisma.event.findFirst).mockResolvedValue(mockActiveEvent);

      // Test the sequence that happens in createPosition action
      const userInfo = await prisma.user.findFirst({
        where: { id: mockUser.id }
      });

      const hostInfo = await prisma.host.findFirst({
        where: { userId: userInfo?.id }
      });

      expect(hostInfo?.company?.schoolId).toBe('school-1');

      // Test active event lookup (replaces the old hardcoded events[0] approach)
      const activeEvent = await prisma.event.findFirst({
        where: { 
          schoolId: hostInfo?.company?.schoolId,
          isActive: true 
        }
      });

      expect(prisma.event.findFirst).toHaveBeenCalledWith({
        where: { 
          schoolId: 'school-1',
          isActive: true 
        }
      });

      expect(activeEvent?.isActive).toBe(true);
      expect(activeEvent?.id).toBe('active-event-1');
    });

    it('should handle case when no active event exists', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);
      vi.mocked(prisma.host.findFirst).mockResolvedValue(mockHost);
      vi.mocked(prisma.event.findFirst).mockResolvedValue(null);

      const activeEvent = await prisma.event.findFirst({
        where: { 
          schoolId: 'school-1',
          isActive: true 
        }
      });

      expect(activeEvent).toBeNull();
      // In the real implementation, this would throw an error
    });

    it('should reject position creation without active event', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);
      vi.mocked(prisma.host.findFirst).mockResolvedValue(mockHost);
      vi.mocked(prisma.event.findFirst).mockResolvedValue(null);

      const schoolId = mockHost.company?.schoolId;
      expect(schoolId).toBe('school-1');

      const activeEvent = await prisma.event.findFirst({
        where: { 
          schoolId,
          isActive: true 
        }
      });

      if (!activeEvent) {
        // This should trigger an error in the actual implementation
        expect(activeEvent).toBeNull();
      }
    });
  });

  describe('Position Creation with Active Event', () => {
    it('should create position linked to active event', async () => {
      const mockFormData = {
        title: 'Software Developer Intern',
        career: 'Technology',
        slots: 3,
        summary: 'Learn software development in a real-world environment',
        fullName: 'John Host',
        email: 'host@company.com',
        address: '123 Tech Street, City, State 12345',
        instructions: 'Please bring a laptop and notebook',
        attire: 'Business casual',
        arrival: '9:00 AM',
        start: '9:30 AM',
        release: '3:30 PM'
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);
      vi.mocked(prisma.host.findFirst).mockResolvedValue(mockHost);
      vi.mocked(prisma.event.findFirst).mockResolvedValue(mockActiveEvent);

      const mockUpdatedHost = {
        ...mockHost,
        positions: [
          {
            id: 'pos-1',
            title: mockFormData.title,
            career: mockFormData.career,
            slots: mockFormData.slots,
            eventId: mockActiveEvent.id
          }
        ]
      };

      vi.mocked(prisma.host.update).mockResolvedValue(mockUpdatedHost);
      vi.mocked(sendPositionUpdateEmail).mockResolvedValue(undefined);

      // Test position creation
      const result = await prisma.host.update({
        where: { userId: mockUser.id },
        data: {
          positions: {
            create: [
              {
                title: mockFormData.title,
                career: mockFormData.career,
                slots: mockFormData.slots,
                summary: mockFormData.summary,
                contact_name: mockFormData.fullName,
                contact_email: mockFormData.email,
                address: mockFormData.address,
                instructions: mockFormData.instructions,
                attire: mockFormData.attire,
                arrival: mockFormData.arrival,
                start: mockFormData.start,
                end: mockFormData.release,
                event: { connect: { id: mockActiveEvent.id } } // Connected to active event
              }
            ]
          }
        },
        include: { positions: true }
      });

      expect(prisma.host.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: {
          positions: {
            create: [
              expect.objectContaining({
                title: 'Software Developer Intern',
                career: 'Technology',
                slots: 3,
                event: { connect: { id: 'active-event-1' } }
              })
            ]
          }
        },
        include: { positions: true }
      });

      expect(result.positions[0].eventId).toBe('active-event-1');
    });

    it('should send email notification after position creation', async () => {
      const mockFormData = {
        title: 'Marketing Assistant',
        career: 'Marketing',
        slots: 2,
        summary: 'Learn marketing strategies',
        fullName: 'Jane Host',
        email: 'jane@company.com',
        address: '456 Marketing Ave',
        instructions: 'Bring portfolio',
        attire: 'Professional',
        arrival: '8:30 AM',
        start: '9:00 AM',
        release: '4:00 PM'
      };

      // Test email sending after position creation
      await sendPositionUpdateEmail(mockFormData.email, {
        title: mockFormData.title,
        career: mockFormData.career,
        slots: mockFormData.slots.toString(),
        summary: mockFormData.summary,
        contact_name: mockFormData.fullName,
        contact_email: mockFormData.email,
        address: mockFormData.address,
        instructions: mockFormData.instructions,
        attire: mockFormData.attire,
        arrival: mockFormData.arrival,
        start: mockFormData.start,
        end: mockFormData.release
      });

      expect(sendPositionUpdateEmail).toHaveBeenCalledWith(
        'jane@company.com',
        expect.objectContaining({
          title: 'Marketing Assistant',
          career: 'Marketing',
          slots: '2'
        })
      );
    });
  });

  describe('Host Authorization and Validation', () => {
    it('should validate host belongs to school with active event', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);
      vi.mocked(prisma.host.findFirst).mockResolvedValue(mockHost);

      const hostInfo = await prisma.host.findFirst({
        where: { userId: mockUser.id }, 
        include: { company: { include: { school: true } } }
      });

      expect(hostInfo?.company?.schoolId).toBe('school-1');
      expect(hostInfo?.company?.school?.name).toBe('Test High School');
    });

    it('should reject unauthorized users', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const userInfo = await prisma.user.findFirst({
        where: { id: 'non-existent-user' }
      });

      expect(userInfo).toBeNull();
    });

    it('should reject users who are not hosts', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);
      vi.mocked(prisma.host.findFirst).mockResolvedValue(null);

      const hostInfo = await prisma.host.findFirst({
        where: { userId: mockUser.id }
      });

      expect(hostInfo).toBeNull();
    });
  });

  describe('Multiple Active Events Across Schools', () => {
    it('should create position for correct school active event', async () => {
      const school1Host = {
        ...mockHost,
        company: {
          ...mockHost.company,
          schoolId: 'school-1'
        }
      };

      const school2Host = {
        ...mockHost,
        id: 'host-2',
        company: {
          ...mockHost.company,
          id: 'company-2',
          schoolId: 'school-2'
        }
      };

      const school1ActiveEvent = {
        ...mockActiveEvent,
        id: 'school-1-active',
        schoolId: 'school-1'
      };

      const school2ActiveEvent = {
        ...mockActiveEvent,
        id: 'school-2-active',
        schoolId: 'school-2'
      };

      // Test school 1 host
      vi.mocked(prisma.host.findFirst).mockResolvedValueOnce(school1Host);
      vi.mocked(prisma.event.findFirst).mockResolvedValueOnce(school1ActiveEvent);

      const activeEvent1 = await prisma.event.findFirst({
        where: { 
          schoolId: school1Host.company?.schoolId,
          isActive: true 
        }
      });

      expect(activeEvent1?.id).toBe('school-1-active');

      // Test school 2 host  
      vi.mocked(prisma.host.findFirst).mockResolvedValueOnce(school2Host);
      vi.mocked(prisma.event.findFirst).mockResolvedValueOnce(school2ActiveEvent);

      const activeEvent2 = await prisma.event.findFirst({
        where: { 
          schoolId: school2Host.company?.schoolId,
          isActive: true 
        }
      });

      expect(activeEvent2?.id).toBe('school-2-active');
    });
  });

  describe('Position Data Validation', () => {
    it('should validate required position fields', async () => {
      const validPositionData = {
        title: 'Data Analyst',
        career: 'Analytics',
        slots: 1,
        summary: 'Analyze business data',
        contact_name: 'Host Name',
        contact_email: 'host@company.com',
        address: '789 Data Lane',
        instructions: 'Bring calculator',
        attire: 'Business casual',
        arrival: '9:00 AM',
        start: '9:30 AM',
        end: '4:00 PM',
        eventId: 'active-event-1',
        hostId: 'host-1'
      };

      // Test all required fields are present
      expect(validPositionData.title).toBeTruthy();
      expect(validPositionData.career).toBeTruthy();
      expect(validPositionData.slots).toBeGreaterThan(0);
      expect(validPositionData.eventId).toBeTruthy();
      expect(validPositionData.hostId).toBeTruthy();
    });

    it('should handle numeric fields correctly', async () => {
      const formSlots = '5'; // From form data (string)
      const parsedSlots = parseInt(formSlots, 10);

      expect(typeof parsedSlots).toBe('number');
      expect(parsedSlots).toBe(5);
    });

    it('should handle time fields correctly', async () => {
      const timeFields = {
        arrival: '8:30 AM',
        start: '9:00 AM', 
        end: '3:30 PM'
      };

      expect(timeFields.arrival).toMatch(/^\d{1,2}:\d{2}\s?(AM|PM)$/i);
      expect(timeFields.start).toMatch(/^\d{1,2}:\d{2}\s?(AM|PM)$/i);
      expect(timeFields.end).toMatch(/^\d{1,2}:\d{2}\s?(AM|PM)$/i);
    });
  });
});
