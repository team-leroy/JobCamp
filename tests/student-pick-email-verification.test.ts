import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redirect, fail } from '@sveltejs/kit';

vi.mock('../src/lib/server/prisma', () => ({
    prisma: {
        school: { findFirst: vi.fn() },
        event: { findFirst: vi.fn() },
        student: { findFirst: vi.fn() },
        user: { findFirst: vi.fn() },
        lotteryJob: { findFirst: vi.fn() },
        lotteryResults: { findFirst: vi.fn() },
        positionsOnStudents: { findMany: vi.fn() },
        position: { findMany: vi.fn() },
        $transaction: vi.fn(),
    }
}));

vi.mock('../src/lib/server/permissionSlips', () => ({
    getPermissionSlipStatus: vi.fn().mockResolvedValue({ hasPermissionSlip: true, hasActiveEvent: true, eventName: 'Test Event' })
}));

vi.mock('../src/lib/server/studentParticipation', () => ({
    trackStudentParticipation: vi.fn().mockResolvedValue(undefined),
    getActiveEventIdForSchool: vi.fn().mockResolvedValue('event-1')
}));

vi.mock('../src/lib/server/contactInfoVerification', () => ({
    needsContactInfoVerification: vi.fn().mockResolvedValue(false)
}));

vi.mock('../src/lib/server/auth', () => ({
    generatePermissionSlipCode: vi.fn().mockResolvedValue('test-code')
}));

vi.mock('../src/lib/server/email', () => ({
    sendPermissionSlipEmail: vi.fn().mockResolvedValue(undefined),
    formatEmailDate: vi.fn().mockReturnValue('Jan 1, 2026')
}));

vi.mock('../src/lib/server/pickUtils', () => ({
    applyPickToggle: vi.fn().mockReturnValue(['pos-1']),
    PickLimitExceededError: class PickLimitExceededError extends Error {}
}));

vi.mock('@sveltejs/kit', () => ({
    redirect: vi.fn((status, location) => { throw { status, location }; }),
    fail: vi.fn((status, data) => ({ status, data }))
}));

import { prisma } from '../src/lib/server/prisma';

const unverifiedUser = { id: 'user-1', emailVerified: false };
const verifiedUser = { id: 'user-1', emailVerified: true };

const mockSchool = { id: 'school-1', webAddr: 'lghs', name: 'Test HS', emailDomain: 'lghs.org' };
const mockStudent = { id: 'student-1', userId: 'user-1', schoolId: 'school-1', parentEmail: 'parent@example.com', firstName: 'Jane' };
const mockActiveEvent = {
    id: 'event-1', isActive: true, studentAccountsEnabled: true,
    studentSignupsEnabled: true, lotteryPublished: false, name: 'JobCamp',
    date: new Date('2026-04-15'), timezone: 'America/Los_Angeles'
};

describe('Student Pick Page — emailVerified enforcement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(prisma.school.findFirst).mockResolvedValue(mockSchool);
        vi.mocked(prisma.event.findFirst).mockResolvedValue(mockActiveEvent);
        vi.mocked(prisma.student.findFirst).mockResolvedValue(mockStudent);
        vi.mocked(prisma.positionsOnStudents.findMany).mockResolvedValue([]);
        vi.mocked(prisma.position.findMany).mockResolvedValue([]);
        vi.mocked(prisma.lotteryJob.findFirst).mockResolvedValue(null);
    });

    describe('load()', () => {
        it('redirects to /verify-email when emailVerified is false', async () => {
            const { load } = await import('../src/routes/dashboard/student/pick/+page.server');
            try {
                await load({ locals: { user: unverifiedUser } } as never);
            } catch {
                // expected redirect throw
            }
            expect(redirect).toHaveBeenCalledWith(302, '/verify-email');
        });

        it('redirects to /login when user is null', async () => {
            const { load } = await import('../src/routes/dashboard/student/pick/+page.server');
            try {
                await load({ locals: { user: null } } as never);
            } catch {
                // expected redirect throw
            }
            expect(redirect).toHaveBeenCalledWith(302, '/login');
        });

        it('proceeds when emailVerified is true', async () => {
            const { load } = await import('../src/routes/dashboard/student/pick/+page.server');
            const result = await load({ locals: { user: verifiedUser } } as never);
            expect(redirect).not.toHaveBeenCalledWith(302, '/verify-email');
            expect(result).toBeDefined();
        });
    });

    describe('togglePosition action', () => {
        it('returns fail(400) when emailVerified is false', async () => {
            const { actions } = await import('../src/routes/dashboard/student/pick/+page.server');
            const formData = new FormData();
            formData.append('id', 'pos-1');
            const result = await actions.togglePosition({
                request: { formData: () => Promise.resolve(formData) } as never,
                locals: { user: unverifiedUser }
            } as never);
            expect(fail).toHaveBeenCalledWith(400, { message: 'Email verification required.' });
            expect(result).toBeDefined();
        });
    });

    describe('sendPermissionSlip action', () => {
        it('returns { sent: false, err: true } when emailVerified is false', async () => {
            const { actions } = await import('../src/routes/dashboard/student/pick/+page.server');
            const formData = new FormData();
            formData.append('parent-email', 'parent@example.com');
            const result = await actions.sendPermissionSlip({
                request: { formData: () => Promise.resolve(formData) } as never,
                locals: { user: unverifiedUser }
            } as never);
            expect(result).toEqual({ sent: false, err: true });
        });
    });

    describe('claimPosition action', () => {
        it('returns fail(400) when emailVerified is false', async () => {
            const { actions } = await import('../src/routes/dashboard/student/pick/+page.server');
            const formData = new FormData();
            formData.append('id', 'pos-1');
            const result = await actions.claimPosition({
                request: { formData: () => Promise.resolve(formData) } as never,
                locals: { user: unverifiedUser }
            } as never);
            expect(fail).toHaveBeenCalledWith(400, { message: 'Email verification required.' });
            expect(result).toBeDefined();
        });
    });
});
