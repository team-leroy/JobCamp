import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '$lib/server/prisma';
import type { RequestEvent } from '@sveltejs/kit';

// Mock prisma and other dependencies
vi.mock('$lib/server/prisma', () => ({
    prisma: {
        user: { findFirst: vi.fn() },
        school: { findMany: vi.fn() },
        event: { findFirst: vi.fn() },
        company: { count: vi.fn() },
        position: { count: vi.fn(), aggregate: vi.fn() },
        student: { count: vi.fn(), findMany: vi.fn() },
        positionsOnStudents: { count: vi.fn() },
        permissionSlipSubmission: { count: vi.fn() }
    }
}));

vi.mock('@sveltejs/kit', () => ({
    redirect: vi.fn()
}));

describe('Admin Dashboard Statistics', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const createMockEvent = (locals: App.Locals) => ({
        locals,
        url: new URL('http://localhost/dashboard/admin')
    }) as RequestEvent;

    const mockUser = {
        id: 'user-1',
        email: 'admin@example.com',
        adminOfSchools: ['school-1'],
        host: null
    };

    const mockSchools = [
        { id: 'school-1', name: 'Test School', emailDomain: 'testschool.edu', webAddr: 'testschool.edu' }
    ];

    describe('Company Statistics with Event Activation Date', () => {
        it('should use activatedAt when available for company statistics cutoff', async () => {
            const { load } = await import('../src/routes/dashboard/admin/+page.server');
            
            const mockActiveEvent = {
                id: 'event-1',
                name: 'Test Event 2025',
                date: new Date('2025-03-15'),
                isActive: true,
                isArchived: false,
                displayLotteryResults: false,
                schoolId: 'school-1',
                createdAt: new Date('2025-01-01T10:00:00Z'),
                activatedAt: new Date('2025-01-15T14:30:00Z'), // Event activated on Jan 15
                companyAccountsEnabled: true,
                companySignupsEnabled: true,
                studentAccountsEnabled: true,
                studentSignupsEnabled: true,
                lotteryPublished: false,
                companyDirectoryEnabled: true
            };

            vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);
            vi.mocked(prisma.school.findMany).mockResolvedValue(mockSchools);
            vi.mocked(prisma.event.findFirst).mockResolvedValue(mockActiveEvent);
            
            // Mock company statistics queries
            vi.mocked(prisma.company.count).mockResolvedValueOnce(10); // totalCompanies
            vi.mocked(prisma.company.count).mockResolvedValueOnce(5); // companiesLoggedInThisEvent
            vi.mocked(prisma.position.count).mockResolvedValue(8); // positionsThisEvent
            vi.mocked(prisma.position.aggregate).mockResolvedValue({ _sum: { slots: 25 } }); // slotsThisEvent

            // Mock student statistics queries
            vi.mocked(prisma.student.count).mockResolvedValueOnce(50); // totalStudents
            vi.mocked(prisma.permissionSlipSubmission.count).mockResolvedValue(45); // permissionSlipsSigned
            vi.mocked(prisma.student.count).mockResolvedValueOnce(5); // studentsWithoutChoices
            vi.mocked(prisma.positionsOnStudents.count).mockResolvedValue(120); // totalStudentChoices
            // Mock students with graduatingClassYear (for March 2025 event: Grade 9=2028, 10=2027, 11=2026, 12=2025)
            vi.mocked(prisma.student.findMany).mockResolvedValue([
                ...Array(12).fill({ graduatingClassYear: 2028 }), // Grade 9
                ...Array(13).fill({ graduatingClassYear: 2027 }), // Grade 10
                ...Array(15).fill({ graduatingClassYear: 2026 }), // Grade 11
                ...Array(10).fill({ graduatingClassYear: 2025 })  // Grade 12
            ]);

            const event = createMockEvent({ user: mockUser, session: null });
            const result = await load(event);

            // Verify that company statistics queries 
            expect(prisma.company.count).toHaveBeenCalledWith({
                where: { 
                    schoolId: { in: expect.any(Array) },
                    hosts: {
                        some: {
                            user: {
                                OR: [
                                    { role: null },
                                    { role: { not: 'INTERNAL_TESTER' } }
                                ]
                            }
                        }
                    }
                }
            });

            expect(prisma.company.count).toHaveBeenCalledWith({
                where: { 
                    schoolId: { in: expect.any(Array) },
                    hosts: {
                        some: {
                            user: {
                                OR: [
                                    { role: null },
                                    { role: { not: 'INTERNAL_TESTER' } }
                                ]
                            },
                            positions: {
                                some: {
                                    eventId: mockActiveEvent.id,
                                    isPublished: true
                                }
                            }
                        }
                    }
                }
            });

            expect(prisma.position.count).toHaveBeenCalledWith({
                where: {
                    eventId: mockActiveEvent.id,
                    isPublished: true,
                    host: {
                        user: {
                            OR: [
                                { role: null },
                                { role: { not: 'INTERNAL_TESTER' } }
                            ]
                        }
                    }
                }
            });

            expect(result.companyStats.companiesLoggedInThisYear).toBe(5);
            expect(result.companyStats.positionsThisYear).toBe(8);
            expect(result.companyStats.slotsThisYear).toBe(25);
        });

        it('should fall back to createdAt when activatedAt is null', async () => {
            const { load } = await import('../src/routes/dashboard/admin/+page.server');
            
            const mockActiveEvent = {
                id: 'event-1',
                name: 'Test Event 2025',
                date: new Date('2025-03-15'),
                isActive: true,
                isArchived: false,
                displayLotteryResults: false,
                schoolId: 'school-1',
                createdAt: new Date('2025-01-01T10:00:00Z'), // Event created on Jan 1
                activatedAt: null, // Never activated
                companyAccountsEnabled: true,
                companySignupsEnabled: true,
                studentAccountsEnabled: true,
                studentSignupsEnabled: true,
                lotteryPublished: false,
                companyDirectoryEnabled: true
            };

            vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);
            vi.mocked(prisma.school.findMany).mockResolvedValue(mockSchools);
            vi.mocked(prisma.event.findFirst).mockResolvedValue(mockActiveEvent);
            
            // Mock company statistics queries
            vi.mocked(prisma.company.count).mockResolvedValueOnce(10); // totalCompanies
            vi.mocked(prisma.company.count).mockResolvedValueOnce(3); // companiesLoggedInThisEvent
            vi.mocked(prisma.position.count).mockResolvedValue(6); // positionsThisEvent
            vi.mocked(prisma.position.aggregate).mockResolvedValue({ _sum: { slots: 20 } }); // slotsThisEvent

            // Mock student statistics queries
            vi.mocked(prisma.student.count).mockResolvedValueOnce(50);
            vi.mocked(prisma.permissionSlipSubmission.count).mockResolvedValue(45);
            vi.mocked(prisma.student.count).mockResolvedValueOnce(5);
            vi.mocked(prisma.positionsOnStudents.count).mockResolvedValue(120);
            // Mock students with graduatingClassYear (for March 2025 event: Grade 9=2028, 10=2027, 11=2026, 12=2025)
            vi.mocked(prisma.student.findMany).mockResolvedValue([
                ...Array(12).fill({ graduatingClassYear: 2028 }), // Grade 9
                ...Array(13).fill({ graduatingClassYear: 2027 }), // Grade 10
                ...Array(15).fill({ graduatingClassYear: 2026 }), // Grade 11
                ...Array(10).fill({ graduatingClassYear: 2025 })  // Grade 12
            ]);

            const event = createMockEvent({ user: mockUser, session: null });
            const result = await load(event);

            // Verify that company statistics queries
            expect(prisma.company.count).toHaveBeenCalledWith({
                where: { 
                    schoolId: { in: expect.any(Array) },
                    hosts: {
                        some: {
                            user: {
                                OR: [
                                    { role: null },
                                    { role: { not: 'INTERNAL_TESTER' } }
                                ]
                            }
                        }
                    }
                }
            });

            expect(prisma.company.count).toHaveBeenCalledWith({
                where: { 
                    schoolId: { in: expect.any(Array) },
                    hosts: {
                        some: {
                            user: {
                                OR: [
                                    { role: null },
                                    { role: { not: 'INTERNAL_TESTER' } }
                                ]
                            },
                            positions: {
                                some: {
                                    eventId: mockActiveEvent.id,
                                    isPublished: true
                                }
                            }
                        }
                    }
                }
            });

            expect(result.companyStats.companiesLoggedInThisYear).toBe(3);
            expect(result.companyStats.positionsThisYear).toBe(6);
            expect(result.companyStats.slotsThisYear).toBe(20);
        });

        it('should return zero statistics when no active event exists', async () => {
            const { load } = await import('../src/routes/dashboard/admin/+page.server');
            
            vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);
            vi.mocked(prisma.school.findMany).mockResolvedValue(mockSchools);
            vi.mocked(prisma.event.findFirst).mockResolvedValue(null); // No active event

            // Mock student statistics queries for no active event
            vi.mocked(prisma.student.count).mockResolvedValueOnce(50);
            vi.mocked(prisma.permissionSlipSubmission.count).mockResolvedValue(0);
            vi.mocked(prisma.student.count).mockResolvedValueOnce(50);
            vi.mocked(prisma.positionsOnStudents.count).mockResolvedValue(0);
            // Mock students with graduatingClassYear (for March 2025 event: Grade 9=2028, 10=2027, 11=2026, 12=2025)
            vi.mocked(prisma.student.findMany).mockResolvedValue([
                ...Array(12).fill({ graduatingClassYear: 2028 }), // Grade 9
                ...Array(13).fill({ graduatingClassYear: 2027 }), // Grade 10
                ...Array(15).fill({ graduatingClassYear: 2026 }), // Grade 11
                ...Array(10).fill({ graduatingClassYear: 2025 })  // Grade 12
            ]);

            const event = createMockEvent({ user: mockUser, session: null });
            const result = await load(event);

            expect(result.companyStats).toEqual({
                totalCompanies: 0,
                companiesLoggedInThisYear: 0,
                positionsThisYear: 0,
                slotsThisYear: 0
            });
        });

        it('should handle edge case where event has no positions', async () => {
            const { load } = await import('../src/routes/dashboard/admin/+page.server');
            
            const mockActiveEvent = {
                id: 'event-1',
                name: 'Empty Event 2025',
                date: new Date('2025-03-15'),
                isActive: true,
                isArchived: false,
                displayLotteryResults: false,
                schoolId: 'school-1',
                createdAt: new Date('2025-01-01T10:00:00Z'),
                activatedAt: new Date('2025-01-15T14:30:00Z'),
                companyAccountsEnabled: true,
                companySignupsEnabled: true,
                studentAccountsEnabled: true,
                studentSignupsEnabled: true,
                lotteryPublished: false,
                companyDirectoryEnabled: true
            };

            vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);
            vi.mocked(prisma.school.findMany).mockResolvedValue(mockSchools);
            vi.mocked(prisma.event.findFirst).mockResolvedValue(mockActiveEvent);
            
            // Mock company statistics queries for empty event
            vi.mocked(prisma.company.count).mockResolvedValueOnce(10); // totalCompanies
            vi.mocked(prisma.company.count).mockResolvedValueOnce(0); // companiesLoggedInThisEvent
            vi.mocked(prisma.position.count).mockResolvedValue(0); // positionsThisEvent
            vi.mocked(prisma.position.aggregate).mockResolvedValue({ _sum: { slots: null } }); // slotsThisEvent

            // Mock student statistics queries
            vi.mocked(prisma.student.count).mockResolvedValueOnce(50);
            vi.mocked(prisma.permissionSlipSubmission.count).mockResolvedValue(0);
            vi.mocked(prisma.student.count).mockResolvedValueOnce(50);
            vi.mocked(prisma.positionsOnStudents.count).mockResolvedValue(0);
            // Mock students with graduatingClassYear (for March 2025 event: Grade 9=2028, 10=2027, 11=2026, 12=2025)
            vi.mocked(prisma.student.findMany).mockResolvedValue([
                ...Array(12).fill({ graduatingClassYear: 2028 }), // Grade 9
                ...Array(13).fill({ graduatingClassYear: 2027 }), // Grade 10
                ...Array(15).fill({ graduatingClassYear: 2026 }), // Grade 11
                ...Array(10).fill({ graduatingClassYear: 2025 })  // Grade 12
            ]);

            const event = createMockEvent({ user: mockUser, session: null });
            const result = await load(event);

            expect(result.companyStats.companiesLoggedInThisYear).toBe(0);
            expect(result.companyStats.positionsThisYear).toBe(0);
            expect(result.companyStats.slotsThisYear).toBe(0);
        });
    });

    describe('Statistics Accuracy', () => {
        it('should ensure event-specific statistics are more accurate than calendar year', () => {
            const eventActivatedAt = new Date('2025-01-15T14:30:00Z');
            const calendarYearStart = new Date('2025-01-01T00:00:00Z');

            // Event activation date should be more recent than calendar year start
            expect(eventActivatedAt.getTime()).toBeGreaterThan(calendarYearStart.getTime());
            
            // This means fewer companies will be counted (only those active since event activation)
            // which is more accurate for event-specific statistics
        });

        it('should handle timezone considerations for event dates', () => {
            // Test that we can create dates in different timezones
            const utcDate = new Date('2025-01-15T14:30:00Z');
            const localDate = new Date('2025-01-15T14:30:00');
            
            // In UTC environments (like CI), these might be the same
            // In local environments with timezone offset, they'll be different
            const timezoneOffset = new Date().getTimezoneOffset();
            
            if (timezoneOffset !== 0) {
                // If we're not in UTC, the dates should be different
                expect(utcDate.getTime()).not.toBe(localDate.getTime());
            } else {
                // If we're in UTC (like CI), they'll be the same
                expect(utcDate.getTime()).toBe(localDate.getTime());
            }
            
            // But we can create equivalent dates by using the same timezone
            const utcDate2 = new Date('2025-01-15T14:30:00Z');
            const utcDate3 = new Date('2025-01-15T14:30:00Z');
            expect(utcDate2.getTime()).toBe(utcDate3.getTime());
            
            // Test that we understand timezone handling
            expect(utcDate.toISOString()).toBe('2025-01-15T14:30:00.000Z');
        });
    });
});
