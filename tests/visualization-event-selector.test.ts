import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load } from '../src/routes/visualizations/+page.server';
import { prisma } from '$lib/server/prisma';
import { redirect } from '@sveltejs/kit';

vi.mock('$lib/server/prisma', () => ({
    prisma: {
        user: { findFirst: vi.fn() },
        event: { 
            findMany: vi.fn(),
            findUnique: vi.fn(),
            findFirst: vi.fn()
        },
        lotteryJob: { findFirst: vi.fn() },
        lotteryResults: { findMany: vi.fn() },
        student: { findMany: vi.fn() },
        position: { findMany: vi.fn() },
        company: { findMany: vi.fn() },
        positionsOnStudents: { findMany: vi.fn() },
    },
}));

vi.mock('@sveltejs/kit', () => ({
    redirect: vi.fn(),
}));

describe('Visualization Event Selector', () => {
    const mockUser = {
        id: 'user-1',
        emailVerified: true,
        adminOfSchools: [{ id: 'school-1', name: 'Test School' }],
        host: null,
    };

    const mockEvents = [
        {
            id: 'event-1',
            name: 'Spring 2025 JobCamp',
            date: new Date('2025-04-15'),
            isActive: true,
            isArchived: false,
            createdAt: new Date('2025-01-01T10:00:00Z'),
            activatedAt: new Date('2025-01-15T14:30:00Z'),
        },
        {
            id: 'event-2',
            name: 'Fall 2024 JobCamp',
            date: new Date('2024-10-15'),
            isActive: false,
            isArchived: true,
            createdAt: new Date('2024-06-01T09:00:00Z'),
            activatedAt: new Date('2024-06-10T11:00:00Z'),
        },
        {
            id: 'event-3',
            name: 'Summer 2025 JobCamp',
            date: new Date('2025-07-15'),
            isActive: false,
            isArchived: false,
            createdAt: new Date('2025-03-01T08:00:00Z'),
            activatedAt: null,
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);
        vi.mocked(prisma.event.findMany).mockResolvedValue(mockEvents);
        vi.mocked(prisma.event.findUnique).mockResolvedValue(mockEvents[0]);
        vi.mocked(prisma.event.findFirst).mockResolvedValue(mockEvents[0]);
        vi.mocked(prisma.lotteryJob.findFirst).mockResolvedValue(null);
        vi.mocked(prisma.lotteryResults.findMany).mockResolvedValue([]);
        vi.mocked(prisma.student.findMany).mockResolvedValue([]);
        vi.mocked(prisma.position.findMany).mockResolvedValue([]);
        vi.mocked(prisma.company.findMany).mockResolvedValue([]);
        vi.mocked(prisma.positionsOnStudents.findMany).mockResolvedValue([]);
    });

    describe('Event Loading', () => {
        it('should load all events for the dropdown', async () => {
            const mockUrl = new URL('https://example.com/visualizations');
            const mockLocals = { user: mockUser };

            await load({ locals: mockLocals, url: mockUrl });

            expect(prisma.event.findMany).toHaveBeenCalledWith({
                where: {
                    schoolId: { in: ['school-1'] }
                },
                orderBy: {
                    date: 'desc'
                },
                select: {
                    id: true,
                    name: true,
                    date: true,
                    isActive: true,
                    isArchived: true,
                    createdAt: true,
                    activatedAt: true
                }
            });
        });

        it('should return all events in the response', async () => {
            const mockUrl = new URL('https://example.com/visualizations');
            const mockLocals = { user: mockUser };

            const result = await load({ locals: mockLocals, url: mockUrl });

            expect(result.allEvents).toEqual(mockEvents);
        });
    });

    describe('Event Selection Logic', () => {
        it('should select active event by default when no eventId parameter', async () => {
            const mockUrl = new URL('https://example.com/visualizations');
            const mockLocals = { user: mockUser };

            const result = await load({ locals: mockLocals, url: mockUrl });

            expect(result.selectedEvent).toEqual(mockEvents[0]); // First event (active)
        });

        it('should select specific event when eventId parameter is provided', async () => {
            const mockUrl = new URL('https://example.com/visualizations?eventId=event-2');
            const mockLocals = { user: mockUser };

            const result = await load({ locals: mockLocals, url: mockUrl });

            expect(result.selectedEvent).toEqual(mockEvents[1]); // Fall 2024 event
        });

        it('should select first available event when specified eventId not found', async () => {
            const mockUrl = new URL('https://example.com/visualizations?eventId=nonexistent');
            const mockLocals = { user: mockUser };

            const result = await load({ locals: mockLocals, url: mockUrl });

            expect(result.selectedEvent).toEqual(mockEvents[0]); // Fallback to first event
        });

        it('should handle case when no events exist', async () => {
            vi.mocked(prisma.event.findMany).mockResolvedValue([]);
            const mockUrl = new URL('https://example.com/visualizations');
            const mockLocals = { user: mockUser };

            const result = await load({ locals: mockLocals, url: mockUrl });

            expect(result.selectedEvent).toBeUndefined();
            expect(result.allEvents).toEqual([]);
        });
    });

    describe('Event Status Display', () => {
        it('should correctly identify active events', async () => {
            const mockUrl = new URL('https://example.com/visualizations?eventId=event-1');
            const mockLocals = { user: mockUser };

            const result = await load({ locals: mockLocals, url: mockUrl });

            expect(result.selectedEvent?.isActive).toBe(true);
            expect(result.selectedEvent?.isArchived).toBe(false);
        });

        it('should correctly identify archived events', async () => {
            const mockUrl = new URL('https://example.com/visualizations?eventId=event-2');
            const mockLocals = { user: mockUser };

            const result = await load({ locals: mockLocals, url: mockUrl });

            expect(result.selectedEvent?.isActive).toBe(false);
            expect(result.selectedEvent?.isArchived).toBe(true);
        });

        it('should correctly identify draft events', async () => {
            const mockUrl = new URL('https://example.com/visualizations?eventId=event-3');
            const mockLocals = { user: mockUser };

            const result = await load({ locals: mockLocals, url: mockUrl });

            expect(result.selectedEvent?.isActive).toBe(false);
            expect(result.selectedEvent?.isArchived).toBe(false);
        });
    });

    describe('Statistics Calculation', () => {
        it('should calculate statistics for selected event', async () => {
            const mockUrl = new URL('https://example.com/visualizations?eventId=event-1');
            const mockLocals = { user: mockUser };

            const result = await load({ locals: mockLocals, url: mockUrl });

            // Verify that statistics functions would be called with the selected event ID
            expect(result.selectedEvent?.id).toBe('event-1');
        });

        it('should return null statistics when no event selected', async () => {
            vi.mocked(prisma.event.findMany).mockResolvedValue([]);
            const mockUrl = new URL('https://example.com/visualizations');
            const mockLocals = { user: mockUser };

            const result = await load({ locals: mockLocals, url: mockUrl });

            expect(result.lotteryStats).toBeNull();
            expect(result.companyStats).toBeNull();
            expect(result.studentStats).toBeNull();
            expect(result.timelineStats).toBeNull();
        });
    });

    describe('Authentication and Authorization', () => {
        it('should redirect unauthenticated users to login', async () => {
            const mockUrl = new URL('https://example.com/visualizations');
            const mockLocals = { user: null };

            try {
                await load({ locals: mockLocals, url: mockUrl });
            } catch {
                // Expected to throw due to redirect
            }

            expect(redirect).toHaveBeenCalledWith(302, '/login');
        });

        it('should redirect users with unverified email', async () => {
            const mockUrl = new URL('https://example.com/visualizations');
            const mockLocals = { 
                user: { 
                    id: 'user-1', 
                    emailVerified: false,
                    host: null 
                } 
            };

            await load({ locals: mockLocals, url: mockUrl });

            expect(redirect).toHaveBeenCalledWith(302, '/verify-email');
        });

        it('should redirect non-admin users to dashboard', async () => {
            const mockUrl = new URL('https://example.com/visualizations');
            const mockLocals = { 
                user: { 
                    id: 'user-1', 
                    emailVerified: true,
                    host: null 
                } 
            };

            vi.mocked(prisma.user.findFirst).mockResolvedValue({
                id: 'user-1',
                emailVerified: true,
                adminOfSchools: [], // No admin schools
                host: null,
            });

            await load({ locals: mockLocals, url: mockUrl });

            expect(redirect).toHaveBeenCalledWith(302, '/dashboard');
        });
    });

    describe('URL Parameter Handling', () => {
        it('should handle empty eventId parameter', async () => {
            const mockUrl = new URL('https://example.com/visualizations?eventId=');
            const mockLocals = { user: mockUser };

            const result = await load({ locals: mockLocals, url: mockUrl });

            // Should default to active event
            expect(result.selectedEvent).toEqual(mockEvents[0]);
        });

        it('should handle multiple eventId parameters (use first)', async () => {
            const mockUrl = new URL('https://example.com/visualizations?eventId=event-1&eventId=event-2');
            const mockLocals = { user: mockUser };

            const result = await load({ locals: mockLocals, url: mockUrl });

            // Should use the first eventId parameter
            expect(result.selectedEvent).toEqual(mockEvents[0]);
        });
    });
});
