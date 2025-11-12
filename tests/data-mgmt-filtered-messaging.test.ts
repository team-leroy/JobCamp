import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '$lib/server/prisma';

// Mock Prisma
vi.mock('$lib/server/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn()
    },
    student: {
      findMany: vi.fn()
    }
  }
}));

// Mock SvelteKit modules
vi.mock('@sveltejs/kit', () => ({
  redirect: vi.fn((status: number, location: string) => {
    const error = new Error(`Redirect to ${location}`) as Error & { status: number; location: string };
    error.status = status;
    error.location = location;
    throw error;
  })
}));

// Mock role utils
vi.mock('$lib/server/roleUtils', () => ({
  canWriteAdminData: vi.fn(() => true),
  canAccessFullAdminFeatures: vi.fn(() => true)
}));

// Mock messaging modules
vi.mock('$lib/server/sendgrid', () => ({
  sendBulkEmail: vi.fn(async () => ({ success: true }))
}));

vi.mock('$lib/server/twilio', () => ({
  sendBulkSMS: vi.fn(async () => ({ sent: 5, failed: 0 }))
}));

describe('Data Management Filtered Student Messaging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('previewFilteredStudents Action', () => {
    it('should return preview of email recipients (students only)', async () => {
      const mockUserInfo = {
        id: 'admin-123',
        adminOfSchools: [{ id: 'school-123' }],
        role: 'FULL_ADMIN'
      };

      const mockStudents = [
        {
          id: 'student-1',
          firstName: 'Alice',
          lastName: 'Smith',
          phone: '1234567890',
          parentEmail: 'parent1@example.com',
          isActive: true,
          user: { email: 'alice@school.edu' }
        },
        {
          id: 'student-2',
          firstName: 'Bob',
          lastName: 'Jones',
          phone: '9876543210',
          parentEmail: 'parent2@example.com',
          isActive: true,
          user: { email: 'bob@school.edu' }
        }
      ];

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUserInfo as never);
      vi.mocked(prisma.student.findMany).mockResolvedValue(mockStudents as never);

      const formData = new FormData();
      formData.append('studentIds', JSON.stringify(['student-1', 'student-2']));
      formData.append('messageType', 'email');
      formData.append('includeParents', '');

      const mockRequest = { formData: async () => formData };
      const mockLocals = { user: { id: 'admin-123' } };

      const { actions } = await import('../src/routes/dashboard/admin/data-mgmt/+page.server');
      const result = await actions.previewFilteredStudents({ 
        request: mockRequest, 
        locals: mockLocals 
      } as never);

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(result.preview).toHaveLength(2);
      expect(result.preview![0]).toEqual({
        name: 'Alice Smith',
        email: 'alice@school.edu'
      });
    });

    it('should include parent emails when requested', async () => {
      const mockUserInfo = {
        id: 'admin-123',
        adminOfSchools: [{ id: 'school-123' }],
        role: 'FULL_ADMIN'
      };

      const mockStudents = [
        {
          id: 'student-1',
          firstName: 'Alice',
          lastName: 'Smith',
          phone: '1234567890',
          parentEmail: 'parent1@example.com',
          isActive: true,
          user: { email: 'alice@school.edu' }
        }
      ];

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUserInfo as never);
      vi.mocked(prisma.student.findMany).mockResolvedValue(mockStudents as never);

      const formData = new FormData();
      formData.append('studentIds', JSON.stringify(['student-1']));
      formData.append('messageType', 'email');
      formData.append('includeParents', 'on');

      const mockRequest = { formData: async () => formData };
      const mockLocals = { user: { id: 'admin-123' } };

      const { actions } = await import('../src/routes/dashboard/admin/data-mgmt/+page.server');
      const result = await actions.previewFilteredStudents({ 
        request: mockRequest, 
        locals: mockLocals 
      } as never);

      expect(result.success).toBe(true);
      expect(result.count).toBe(2); // Student + parent
      expect(result.preview).toHaveLength(2);
      expect(result.preview![1]).toEqual({
        name: 'Alice Smith (Parent)',
        email: 'parent1@example.com'
      });
    });

    it('should return preview of SMS recipients with phone numbers', async () => {
      const mockUserInfo = {
        id: 'admin-123',
        adminOfSchools: [{ id: 'school-123' }],
        role: 'FULL_ADMIN'
      };

      const mockStudents = [
        {
          id: 'student-1',
          firstName: 'Alice',
          lastName: 'Smith',
          phone: '1234567890',
          parentEmail: 'parent1@example.com',
          isActive: true,
          user: { email: 'alice@school.edu' }
        }
      ];

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUserInfo as never);
      vi.mocked(prisma.student.findMany).mockResolvedValue(mockStudents as never);

      const formData = new FormData();
      formData.append('studentIds', JSON.stringify(['student-1']));
      formData.append('messageType', 'sms');

      const mockRequest = { formData: async () => formData };
      const mockLocals = { user: { id: 'admin-123' } };

      const { actions } = await import('../src/routes/dashboard/admin/data-mgmt/+page.server');
      const result = await actions.previewFilteredStudents({ 
        request: mockRequest, 
        locals: mockLocals 
      } as never);

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.preview![0]).toEqual({
        name: 'Alice Smith',
        phone: '1234567890'
      });
    });

    it('should return error when no students selected', async () => {
      const mockUserInfo = {
        id: 'admin-123',
        adminOfSchools: [{ id: 'school-123' }],
        role: 'FULL_ADMIN'
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUserInfo as never);

      const formData = new FormData();
      formData.append('studentIds', JSON.stringify([]));
      formData.append('messageType', 'email');

      const mockRequest = { formData: async () => formData };
      const mockLocals = { user: { id: 'admin-123' } };

      const { actions } = await import('../src/routes/dashboard/admin/data-mgmt/+page.server');
      const result = await actions.previewFilteredStudents({ 
        request: mockRequest, 
        locals: mockLocals 
      } as never);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No students selected');
    });
  });

  describe('sendToFilteredStudents Action', () => {
    it('should send emails to filtered students', async () => {
      const { sendBulkEmail } = await import('$lib/server/sendgrid');

      const mockUserInfo = {
        id: 'admin-123',
        adminOfSchools: [{ id: 'school-123' }],
        role: 'FULL_ADMIN'
      };

      const mockStudents = [
        {
          id: 'student-1',
          firstName: 'Alice',
          lastName: 'Smith',
          phone: '1234567890',
          parentEmail: 'parent1@example.com',
          isActive: true,
          user: { email: 'alice@school.edu' }
        },
        {
          id: 'student-2',
          firstName: 'Bob',
          lastName: 'Jones',
          phone: '9876543210',
          parentEmail: 'parent2@example.com',
          isActive: true,
          user: { email: 'bob@school.edu' }
        }
      ];

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUserInfo as never);
      vi.mocked(prisma.student.findMany).mockResolvedValue(mockStudents as never);

      const formData = new FormData();
      formData.append('studentIds', JSON.stringify(['student-1', 'student-2']));
      formData.append('messageType', 'email');
      formData.append('subject', 'Test Subject');
      formData.append('message', 'Test message');

      const mockRequest = { formData: async () => formData };
      const mockLocals = { user: { id: 'admin-123' } };

      const { actions } = await import('../src/routes/dashboard/admin/data-mgmt/+page.server');
      const result = await actions.sendToFilteredStudents({ 
        request: mockRequest, 
        locals: mockLocals 
      } as never);

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(sendBulkEmail).toHaveBeenCalledWith(
        ['alice@school.edu', 'bob@school.edu'],
        'Test Subject',
        'Test message'
      );
    });

    it('should send SMS to filtered students', async () => {
      const { sendBulkSMS } = await import('$lib/server/twilio');

      const mockUserInfo = {
        id: 'admin-123',
        adminOfSchools: [{ id: 'school-123' }],
        role: 'FULL_ADMIN'
      };

      const mockStudents = [
        {
          id: 'student-1',
          firstName: 'Alice',
          lastName: 'Smith',
          phone: '1234567890',
          parentEmail: 'parent1@example.com',
          isActive: true,
          user: { email: 'alice@school.edu' }
        }
      ];

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUserInfo as never);
      vi.mocked(prisma.student.findMany).mockResolvedValue(mockStudents as never);

      const formData = new FormData();
      formData.append('studentIds', JSON.stringify(['student-1']));
      formData.append('messageType', 'sms');
      formData.append('message', 'Test SMS');

      const mockRequest = { formData: async () => formData };
      const mockLocals = { user: { id: 'admin-123' } };

      const { actions } = await import('../src/routes/dashboard/admin/data-mgmt/+page.server');
      const result = await actions.sendToFilteredStudents({ 
        request: mockRequest, 
        locals: mockLocals 
      } as never);

      expect(result.success).toBe(true);
      expect(sendBulkSMS).toHaveBeenCalledWith(['1234567890'], 'Test SMS');
    });

    it('should return error when subject is missing for email', async () => {
      const mockUserInfo = {
        id: 'admin-123',
        adminOfSchools: [{ id: 'school-123' }],
        role: 'FULL_ADMIN'
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUserInfo as never);

      const formData = new FormData();
      formData.append('studentIds', JSON.stringify(['student-1']));
      formData.append('messageType', 'email');
      formData.append('message', 'Test message');

      const mockRequest = { formData: async () => formData };
      const mockLocals = { user: { id: 'admin-123' } };

      const { actions } = await import('../src/routes/dashboard/admin/data-mgmt/+page.server');
      const result = await actions.sendToFilteredStudents({ 
        request: mockRequest, 
        locals: mockLocals 
      } as never);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Subject is required');
    });

    it('should return error when message is missing', async () => {
      const mockUserInfo = {
        id: 'admin-123',
        adminOfSchools: [{ id: 'school-123' }],
        role: 'FULL_ADMIN'
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUserInfo as never);

      const formData = new FormData();
      formData.append('studentIds', JSON.stringify(['student-1']));
      formData.append('messageType', 'email');
      formData.append('subject', 'Test');

      const mockRequest = { formData: async () => formData };
      const mockLocals = { user: { id: 'admin-123' } };

      const { actions } = await import('../src/routes/dashboard/admin/data-mgmt/+page.server');
      const result = await actions.sendToFilteredStudents({ 
        request: mockRequest, 
        locals: mockLocals 
      } as never);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Message is required');
    });
  });

  describe('Permission Checks', () => {
    it('should reject preview when user lacks full admin access', async () => {
      const { canAccessFullAdminFeatures } = await import('$lib/server/roleUtils');
      
      vi.mocked(canAccessFullAdminFeatures).mockReturnValue(false);

      const mockUserInfo = {
        id: 'admin-123',
        adminOfSchools: [{ id: 'school-123' }],
        role: 'READ_ONLY_ADMIN'
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUserInfo as never);

      const formData = new FormData();
      formData.append('studentIds', JSON.stringify(['student-1']));
      formData.append('messageType', 'email');

      const mockRequest = { formData: async () => formData };
      const mockLocals = { user: { id: 'admin-123' } };

      const { actions } = await import('../src/routes/dashboard/admin/data-mgmt/+page.server');
      const result = await actions.previewFilteredStudents({ 
        request: mockRequest, 
        locals: mockLocals 
      } as never);

      expect(result.success).toBe(false);
      expect(result.message).toContain('permission');
    });

    it('should reject send when user lacks full admin access', async () => {
      const { canAccessFullAdminFeatures } = await import('$lib/server/roleUtils');
      
      vi.mocked(canAccessFullAdminFeatures).mockReturnValue(false);

      const mockUserInfo = {
        id: 'admin-123',
        adminOfSchools: [{ id: 'school-123' }],
        role: 'READ_ONLY_ADMIN'
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUserInfo as never);

      const formData = new FormData();
      formData.append('studentIds', JSON.stringify(['student-1']));
      formData.append('messageType', 'email');
      formData.append('subject', 'Test');
      formData.append('message', 'Test');

      const mockRequest = { formData: async () => formData };
      const mockLocals = { user: { id: 'admin-123' } };

      const { actions } = await import('../src/routes/dashboard/admin/data-mgmt/+page.server');
      const result = await actions.sendToFilteredStudents({ 
        request: mockRequest, 
        locals: mockLocals 
      } as never);

      expect(result.success).toBe(false);
      expect(result.message).toContain('permission');
    });
  });
});

