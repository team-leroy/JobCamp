import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        redirect(302, "/login");
    }
    if (!locals.user.emailVerified) {
        redirect(302, "/verify-email");
    }

    // Check if user is admin
    const userInfo = await prisma.user.findFirst({
        where: { id: locals.user.id },
        include: { adminOfSchools: true }
    });

    if (!userInfo?.adminOfSchools?.length) {
        redirect(302, "/dashboard");
    }

    const schoolIds = userInfo.adminOfSchools.map(s => s.id);

    // Get the active event for this school
    const activeEvent = await prisma.event.findFirst({
        where: {
            schoolId: { in: schoolIds },
            isActive: true
        }
    });

    if (!activeEvent) {
        return {
            hasActiveEvent: false,
            activeEvent: null,
            students: [],
            totalStudents: 0
        };
    }

    // Get students from the active event's school
    const students = await prisma.student.findMany({
        where: {
            schoolId: { in: schoolIds }
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

    // Get lottery results for these students
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

    // Get positions for lottery results
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

    // Create a map of positions by ID
    const positionMap = new Map();
    positions.forEach(position => {
        positionMap.set(position.id, position);
    });

    // Create a map of lottery results by student ID
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

    // Transform student data for the UI
    const transformedStudents = students.map(student => {
        const lotteryResult = lotteryMap.get(student.id);
        const permissionSlip = student.permissionSlips[0];
        
        return {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            grade: student.grade,
            phone: student.phone,
            email: student.user.email,
            parentEmail: student.parentEmail,
            permissionSlipStatus: permissionSlip ? 'Complete' : 'Not Started',
            permissionSlipDate: permissionSlip?.createdAt,
            lastLogin: student.user.lastLogin,
            studentPicks: student.positionsSignedUpFor.map(pos => ({
                rank: pos.rank,
                positionId: pos.position.id,
                title: pos.position.title,
                companyName: pos.position.host.company.companyName,
                career: pos.position.career
            })),
            lotteryAssignment: lotteryResult ? {
                positionId: lotteryResult.position.id,
                title: lotteryResult.position.title,
                companyName: lotteryResult.position.host.company.companyName,
                career: lotteryResult.position.career,
                assignedAt: lotteryResult.lotteryJob.completedAt
            } : null,
            lotteryStatus: lotteryResult ? 'Assigned' : (student.positionsSignedUpFor.length > 0 ? 'Unassigned' : 'No Picks')
        };
    });

    return {
        hasActiveEvent: true,
        activeEvent: {
            id: activeEvent.id,
            name: activeEvent.name,
            date: activeEvent.date
        },
        students: transformedStudents,
        totalStudents: transformedStudents.length
    };
};

export const actions: Actions = {
    updateStudent: async ({ request, locals }) => {
        if (!locals.user) {
            return { success: false, message: "Not authenticated" };
        }

        try {
            const formData = await request.formData();
            const studentId = formData.get('studentId')?.toString();
            const firstName = formData.get('firstName')?.toString();
            const lastName = formData.get('lastName')?.toString();
            const grade = formData.get('grade')?.toString();
            const phone = formData.get('phone')?.toString();
            const email = formData.get('email')?.toString();
            const parentEmail = formData.get('parentEmail')?.toString();

            if (!studentId || !firstName || !lastName || !grade) {
                return { success: false, message: "Missing required fields" };
            }

            // Update student record
            await prisma.student.update({
                where: { id: studentId },
                data: {
                    firstName,
                    lastName,
                    grade: parseInt(grade),
                    phone,
                    parentEmail
                }
            });

            // Update user email if provided
            if (email) {
                const student = await prisma.student.findUnique({
                    where: { id: studentId },
                    select: { userId: true }
                });

                if (student) {
                    await prisma.user.update({
                        where: { id: student.userId },
                        data: { email }
                    });
                }
            }

            return { success: true, message: "Student updated successfully" };
        } catch (error) {
            console.error('Error updating student:', error);
            return { success: false, message: "Failed to update student" };
        }
    },

    exportStudents: async ({ request, locals }) => {
        if (!locals.user) {
            return new Response("Not authenticated", { status: 401 });
        }

        try {
            // Get filter parameters from form data
            const formData = await request.formData();
            const lastNameFilter = formData.get('lastName')?.toString() || '';
            const gradeFilter = formData.get('grade')?.toString() || 'All';
            const permissionSlipFilter = formData.get('permissionSlip')?.toString() || 'All';
            const lotteryStatusFilter = formData.get('lotteryStatus')?.toString() || 'All';

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
                    student.firstName,
                    student.lastName,
                    student.grade,
                    `"${student.phone}"`,
                    student.email,
                    student.parentEmail,
                    student.permissionSlipStatus,
                    student.lastLogin,
                    `"${student.studentPicks}"`,
                    `"${student.lotteryAssignment}"`
                ].join(','))
            ];

            const csvContent = csvRows.join('\n');

            // Return CSV file
            return new Response(csvContent, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="students-${new Date().toISOString().split('T')[0]}.csv"`
                }
            });
        } catch (error) {
            console.error('Error exporting students:', error);
            return new Response("Failed to export students", { status: 500 });
        }
    }
};
