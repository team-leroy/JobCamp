import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async ({ url, locals }) => {
    if (!locals.user) {
        return new Response("Not authenticated", { status: 401 });
    }

    try {
        // Get filter parameters from URL
        const lastNameFilter = url.searchParams.get('lastName') || '';
        const gradeFilter = url.searchParams.get('grade') || 'All';
        const permissionSlipFilter = url.searchParams.get('permissionSlip') || 'All';
        const lotteryStatusFilter = url.searchParams.get('lotteryStatus') || 'All';

        // Check if user is admin
        const userInfo = await prisma.user.findFirst({
            where: { id: locals.user.id },
            include: { adminOfSchools: true }
        });

        if (!userInfo?.adminOfSchools?.length) {
            return new Response("Not authorized", { status: 403 });
        }

        const schoolIds = userInfo.adminOfSchools.map(s => s.id);

        // Get the active event
        const activeEvent = await prisma.event.findFirst({
            where: {
                schoolId: { in: schoolIds },
                isActive: true
            }
        });

        if (!activeEvent) {
            return new Response("No active event found", { status: 404 });
        }

        // Get students with same logic as load function
        const students = await prisma.student.findMany({
            where: {
                schoolId: { in: schoolIds },
                isActive: true
            },
            include: {
                user: {
                    select: {
                        email: true,
                        lastLogin: true
                    }
                },
                positionsSignedUpFor: {
                    include: {
                        position: {
                            include: {
                                host: {
                                    include: {
                                        company: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        rank: 'asc'
                    }
                },
                permissionSlips: {
                    where: {
                        eventId: activeEvent.id
                    },
                    take: 1
                }
            },
            orderBy: {
                lastName: 'asc'
            }
        });

        // Get lottery results
        const lotteryResults = await prisma.lotteryResults.findMany({
            where: {
                studentId: { in: students.map(s => s.id) },
                lotteryJob: {
                    eventId: activeEvent.id
                }
            },
            include: {
                lotteryJob: true
            }
        });

        const positionIds = lotteryResults.map(result => result.positionId);
        const positions = await prisma.position.findMany({
            where: {
                id: { in: positionIds }
            },
            include: {
                host: {
                    include: {
                        company: true
                    }
                }
            }
        });

        const positionMap = new Map();
        positions.forEach(position => {
            positionMap.set(position.id, position);
        });

        const lotteryMap = new Map();
        lotteryResults.forEach(result => {
            const position = positionMap.get(result.positionId);
            if (position) {
                lotteryMap.set(result.studentId, {
                    ...result,
                    position
                });
            }
        });

        // Transform and filter students
        const filteredStudents = students.filter(student => {
            const matchesLastName = !lastNameFilter || 
                student.lastName.toLowerCase().includes(lastNameFilter.toLowerCase());
            
            const matchesGrade = gradeFilter === "All" || 
                student.grade.toString() === gradeFilter;
            
            const permissionSlip = student.permissionSlips[0];
            const permissionSlipStatus = permissionSlip ? 'Complete' : 'Not Started';
            const matchesPermissionSlip = permissionSlipFilter === "All" || 
                permissionSlipStatus === permissionSlipFilter;
            
            const lotteryResult = lotteryMap.get(student.id);
            const lotteryStatus = lotteryResult ? 'Assigned' : (student.positionsSignedUpFor.length > 0 ? 'Unassigned' : 'No Picks');
            const matchesLotteryStatus = lotteryStatusFilter === "All" || 
                lotteryStatus === lotteryStatusFilter;

            return matchesLastName && matchesGrade && matchesPermissionSlip && matchesLotteryStatus;
        }).map(student => {
            const permissionSlip = student.permissionSlips[0];
            const lotteryResult = lotteryMap.get(student.id);
            
            return {
                firstName: student.firstName,
                lastName: student.lastName,
                grade: student.grade,
                phone: student.phone || '',
                email: student.user.email || '',
                parentEmail: student.parentEmail || '',
                permissionSlipStatus: permissionSlip ? 'Complete' : 'Not Started',
                lastLogin: student.user.lastLogin ? new Date(student.user.lastLogin).toISOString() : 'Never',
                studentPicks: student.positionsSignedUpFor.map(pos => 
                    `${pos.rank}. ${pos.position.host.company.companyName} - ${pos.position.title}`
                ).join('; '),
                lotteryAssignment: lotteryResult 
                    ? `${lotteryResult.position.host.company.companyName} - ${lotteryResult.position.title}`
                    : 'None'
            };
        });

        // Generate CSV
        const headers = ['First Name', 'Last Name', 'Grade', 'Phone', 'Email', 'Parent Email', 'Permission Slip Status', 'Last Login', 'Student Picks', 'Lottery Assignment'];
        const csvRows = [
            headers.join(','),
            ...filteredStudents.map(student => [
                `"${student.firstName}"`,
                `"${student.lastName}"`,
                student.grade,
                `"${student.phone}"`,
                `"${student.email}"`,
                `"${student.parentEmail}"`,
                `"${student.permissionSlipStatus}"`,
                `"${student.lastLogin}"`,
                `"${student.studentPicks}"`,
                `"${student.lotteryAssignment}"`
            ].join(','))
        ];

        const csvContent = csvRows.join('\n');

        // Return CSV file
        return new Response(csvContent, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="students-${new Date().toISOString().split('T')[0]}.csv"`
            }
        });
    } catch (error) {
        console.error('Error exporting students:', error);
        return new Response("Failed to export students", { status: 500 });
    }
};

