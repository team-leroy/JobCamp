import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import type { UserRole } from '@prisma/client';
import { careers } from '$lib/appconfig';
import { scrypt } from '$lib/server/hash';
import crypto from 'node:crypto';
import { getCurrentGrade, getGraduatingClassYear } from '$lib/server/gradeUtils';
import { canWriteAdminData, canAccessFullAdminFeatures } from '$lib/server/roleUtils';
import { sendBulkEmail } from '$lib/server/sendgrid';
import { sendBulkSMS } from '$lib/server/twilio';
import { sendPositionUpdateEmail, formatEmailDate } from '$lib/server/email';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        redirect(302, "/login");
    }

    // Check if user is admin first - admins can access without email verification
    const userInfo = await prisma.user.findFirst({
        where: { id: locals.user.id },
        include: { adminOfSchools: true }
    });

    if (!userInfo?.adminOfSchools?.length) {
        redirect(302, "/dashboard");
    }

    // Admins can access without email verification

    const schoolIds = userInfo.adminOfSchools.map(s => s.id);

    // Get all events for these schools
    const allEvents = await prisma.event.findMany({
        where: {
            schoolId: { in: schoolIds }
        },
        orderBy: { date: 'desc' },
        select: {
            id: true,
            name: true,
            date: true,
            isActive: true,
            createdAt: true
        }
    });

    // Get the active event for this school
    const activeEvent = allEvents.find(e => e.isActive);

    if (!activeEvent) {
        return {
            hasActiveEvent: false,
            activeEvent: null,
            allEvents: allEvents.map(e => ({
                id: e.id,
                name: e.name,
                date: e.date.toISOString(),
                isActive: e.isActive
            })),
            students: [],
            totalStudents: 0,
            companies: [],
            totalCompanies: 0,
            hosts: [],
            totalHosts: 0,
            positions: [],
            totalPositions: 0,
            careers: careers,
            isAdmin: true,
            loggedIn: true,
            isHost: !!locals.user.host,
            userRole: userInfo.role,
            canEdit: canWriteAdminData(userInfo)
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
                    lastLogin: true,
                    role: true,
                    emailVerified: true
                }
            },
            positionsSignedUpFor: {
                where: {
                    position: {
                        eventId: activeEvent.id
                    }
                },
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
            },
            eventParticipation: {
                select: {
                    eventId: true
                }
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
    // Convert graduatingClassYear to grade for display
    const transformedStudents = students.map(student => {
        const lotteryResult = lotteryMap.get(student.id);
        const slip = student.permissionSlips[0];
        
        const grade = student.graduatingClassYear 
            ? getCurrentGrade(student.graduatingClassYear, activeEvent.date)
            : null;
        
        return {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            grade: grade,
            graduatingClassYear: student.graduatingClassYear,
            phone: student.phone,
            email: student.user?.email || 'No Email',
            emailVerified: student.user?.emailVerified || false,
            parentEmail: student.parentEmail,
            permissionSlipStatus: slip ? 'Complete' : 'Not Started',
            permissionSlipDate: slip?.createdAt ? new Date(slip.createdAt).toISOString() : null,
            lastLogin: student.user?.lastLogin ? new Date(student.user.lastLogin).toISOString() : null,
            isInternalTester: student.user?.role === 'INTERNAL_TESTER',
            studentPicks: student.positionsSignedUpFor.map(pos => ({
                rank: pos.rank,
                positionId: pos.position.id,
                title: pos.position.title,
                companyName: pos.position.host?.company?.companyName || 'No Company',
                career: pos.position.career
            })),
            lotteryAssignment: lotteryResult ? {
                positionId: lotteryResult.position.id,
                title: lotteryResult.position.title,
                companyName: lotteryResult.position.host?.company?.companyName || 'No Company',
                career: lotteryResult.position.career,
                assignedAt: lotteryResult.lotteryJob.completedAt ? new Date(lotteryResult.lotteryJob.completedAt).toISOString() : null
            } : null,
            lotteryStatus: lotteryResult ? 'Assigned' : (student.positionsSignedUpFor.length > 0 ? 'Unassigned' : 'No Picks'),
            eventIds: student.eventParticipation.map(p => p.eventId)
        };
    });

    // Get positions for all events in these schools
    const allPositions = await prisma.position.findMany({
        where: {
            event: {
                schoolId: { in: schoolIds }
            }
        },
        include: {
            host: {
                include: {
                    company: {
                        select: {
                            id: true, // Added id to link with companies
                            companyName: true
                        }
                    },
                    user: {
                        select: {
                            email: true,
                            role: true
                        }
                    }
                }
            },
            event: {
                select: {
                    name: true,
                    date: true
                }
            }
        },
        orderBy: {
            title: 'asc'
        }
    });

    // Transform position data for the UI
    const transformedPositions = allPositions.map(position => {
        return {
            id: position.id,
            title: position.title,
            career: position.career,
            slots: position.slots,
            summary: position.summary,
            contactName: position.contact_name,
            contactEmail: position.contact_email,
            address: position.address,
            instructions: position.instructions,
            attire: position.attire,
            arrival: position.arrival,
            start: position.start,
            end: position.end,
            eventId: position.eventId, // Added eventId
            createdAt: position.createdAt ? new Date(position.createdAt).toISOString() : null,
            publishedAt: position.publishedAt ? new Date(position.publishedAt).toISOString() : null,
            hostName: position.host?.name || 'No Host',
            companyId: position.host?.company?.id, // Added companyId
            companyName: position.host?.company?.companyName || 'No Company',
            isPublished: position.isPublished,
            isInternalTester: position.host?.user?.role === 'INTERNAL_TESTER'
        };
    });

    // Get companies from the active event's school
    const companies = await prisma.company.findMany({
        where: {
            schoolId: { in: schoolIds }
        },
        include: {
            hosts: {
                include: {
                    user: {
                        select: {
                            email: true,
                            lastLogin: true,
                            role: true,
                            emailVerified: true
                        }
                    },
                    positions: {
                        select: {
                            id: true,
                            eventId: true,
                            isPublished: true,
                            slots: true
                        }
                    }
                }
            }
        },
        orderBy: {
            companyName: 'asc'
        }
    });

    // Transform company data for the UI
    const transformedCompanies = companies.map(company => {
        // Get all unique event IDs this company has positions in
        const participatedEventIds = new Set<string>();

        const companyHosts = company.hosts.map(host => {
            // 1. Add ALL events where they have any position (published or draft)
            host.positions.forEach(pos => {
                participatedEventIds.add(pos.eventId);
            });

            // 2. Add the active event if they have logged in since it was created
            if (activeEvent && host.user?.lastLogin) {
                const lastLoginTime = new Date(host.user.lastLogin).getTime();
                const eventCreatedTime = new Date(activeEvent.createdAt).getTime();
                
                if (lastLoginTime >= eventCreatedTime) {
                    participatedEventIds.add(activeEvent.id);
                }
            }

            // Get positions for this host in the active event
            const hostPositions = transformedPositions.filter(p => 
                p.companyId === company.id && 
                p.eventId === activeEvent.id &&
                allPositions.find(ap => ap.id === p.id)?.hostId === host.id
            );

            return {
                id: host.id,
                name: host.name,
                email: host.user?.email || 'No Email',
                emailVerified: host.user?.emailVerified || false,
                lastLogin: host.user?.lastLogin ? new Date(host.user.lastLogin).toISOString() : null,
                isInternalTester: host.user?.role === 'INTERNAL_TESTER',
                positions: hostPositions
            };
        });

        // Get this company's positions for the active event (all hosts)
        const activePositions = transformedPositions.filter(p => 
            p.companyId === company.id && 
            p.eventId === activeEvent.id
        );

        // Calculate counts from the current event's positions
        // Only count published positions for the "Active Positions" summary
        const currentEventPublishedPositions = activePositions.filter(p => p.isPublished);
        const activePositionCount = currentEventPublishedPositions.length;
        const activeSlotsCount = currentEventPublishedPositions.reduce((sum, p) => sum + p.slots, 0);

        // A company is an internal tester company if it has hosts and all its hosts are internal testers
        const isInternalTester = company.hosts.length > 0 && company.hosts.every(h => h.user?.role === 'INTERNAL_TESTER');

        // A company has a verified host if any of its hosts are verified
        const emailVerified = company.hosts.some(h => h.user?.emailVerified);

        return {
            id: company.id,
            companyName: company.companyName,
            companyDescription: company.companyDescription,
            companyUrl: company.companyUrl || '',
            activePositionCount,
            activeSlotsCount,
            activePositions,
            hosts: companyHosts,
            isInternalTester,
            emailVerified,
            eventIds: Array.from(participatedEventIds)
        };
    });

    // Get hosts from companies in the active event's school
    const hosts = await prisma.host.findMany({
        where: {
            company: {
                schoolId: { in: schoolIds }
            }
        },
        include: {
            user: {
                select: {
                    email: true,
                    lastLogin: true,
                    role: true,
                    emailVerified: true
                }
            },
            company: {
                select: {
                    companyName: true
                }
            },
            positions: {
                select: {
                    eventId: true,
                    isPublished: true
                }
            }
        },
        orderBy: {
            name: 'asc'
        }
    });

    // Transform host data for the UI
    const transformedHosts = hosts.map(host => {
        const participatedEventIds = new Set<string>();
        
        // 1. Add ALL events where they have any position (published or draft)
        host.positions.forEach(pos => {
            participatedEventIds.add(pos.eventId);
        });

        // 2. Add the active event if they have logged in since it was created
        if (activeEvent && host.user?.lastLogin) {
            const lastLoginTime = new Date(host.user.lastLogin).getTime();
            const eventCreatedTime = new Date(activeEvent.createdAt).getTime();
            
            if (lastLoginTime >= eventCreatedTime) {
                participatedEventIds.add(activeEvent.id);
            }
        }

        return {
            id: host.id,
            name: host.name,
            email: host.user?.email || 'No Email',
            emailVerified: host.user?.emailVerified || false,
            lastLogin: host.user?.lastLogin ? new Date(host.user.lastLogin).toISOString() : null,
            isInternalTester: host.user?.role === 'INTERNAL_TESTER',
            companyName: host.company?.companyName || 'No Company',
            eventIds: Array.from(participatedEventIds)
        };
    });

    return {
        hasActiveEvent: true,
        activeEvent: {
            id: activeEvent.id,
            name: activeEvent.name,
            date: activeEvent.date.toISOString()
        },
        allEvents: allEvents.map(e => ({
            id: e.id,
            name: e.name,
            date: e.date.toISOString(),
            isActive: e.isActive
        })),
        students: transformedStudents,
        totalStudents: transformedStudents.length,
        companies: transformedCompanies,
        totalCompanies: transformedCompanies.length,
        hosts: transformedHosts,
        totalHosts: transformedHosts.length,
        positions: transformedPositions,
        totalPositions: transformedPositions.length,
        careers: careers,
        isAdmin: true,
        loggedIn: true,
        isHost: !!locals.user.host,
        userRole: userInfo.role,
        canEdit: canWriteAdminData(userInfo)
    };
};

// Helper function to find or create an admin host for admin-created positions
async function getOrCreateAdminHost(schoolId: string) {
    // First, try to find an existing admin user with admin@jobcamp.org email
    const adminUser = await prisma.user.findUnique({
        where: { email: 'admin@jobcamp.org' },
        include: { host: true }
    });

    if (adminUser?.host) {
        return adminUser.host;
    }

    // If no admin user exists, create one
    // First check if a user with this email exists
    let user = adminUser;
    if (!user) {
        // Create a dummy user (we won't use it for login, just for host association)
        // Use scrypt for password hashing to match the existing pattern
        const passwordSalt = crypto.randomBytes(16).toString('base64');
        const passwordHash = await scrypt.hash('dummy', passwordSalt);
        
        user = await prisma.user.create({
            data: {
                email: 'admin@jobcamp.org',
                passwordHash,
                passwordSalt,
                emailVerified: true,
                lastLogin: new Date()
            }
        });
    }

    // Create or find the admin host
    let host = user.host;
    if (!host) {
        // Find a company for this host (or create a generic one)
        let company = await prisma.company.findFirst({
            where: {
                companyName: 'JobCamp Admin',
                schoolId: schoolId
            }
        });

        if (!company) {
            company = await prisma.company.create({
                data: {
                    companyName: 'JobCamp Admin',
                    companyDescription: 'Administrative company for admin-created positions',
                    schoolId: schoolId
                }
            });
        }

        host = await prisma.host.create({
            data: {
                name: 'JobCamp Admin',
                companyId: company.id,
                userId: user.id
            }
        });
    }

    return host;
}

export const actions: Actions = {
    updateStudent: async ({ request, locals }) => {
        if (!locals.user) {
            return { success: false, message: "Not authenticated" };
        }

        // Check if user has write permissions
        const userInfo = await prisma.user.findFirst({
            where: { id: locals.user.id },
            include: { adminOfSchools: true }
        });

        if (!canWriteAdminData(userInfo!)) {
            return { success: false, message: "You do not have permission to edit data" };
        }

        try {
            const formData = await request.formData();
            
            // Log ALL form data keys for debugging
            const allKeys = Array.from(formData.keys());
            console.log(`[Update] DEBUG: Received form keys: ${allKeys.join(', ')}`);
            for (const key of allKeys) {
                console.log(`[Update] DEBUG: ${key} = ${formData.get(key)}`);
            }

            const studentId = formData.get('studentId')?.toString();
            const firstName = formData.get('firstName')?.toString();
            const lastName = formData.get('lastName')?.toString();
            const grade = formData.get('grade')?.toString();
            const phone = formData.get('phone')?.toString();
            const email = formData.get('email')?.toString();
            const parentEmail = formData.get('parentEmail')?.toString();
            const isInternalTester = formData.get('isInternalTester') === 'true';

            if (!studentId || !firstName || !lastName || !grade) {
                return { success: false, message: "Missing required fields" };
            }

            if (!userInfo?.adminOfSchools?.length) {
                return { success: false, message: "Not authorized" };
            }

            const schoolIds = userInfo.adminOfSchools.map(s => s.id);
            const activeEvent = await prisma.event.findFirst({
                where: {
                    schoolId: { in: schoolIds },
                    isActive: true
                }
            });

            if (!activeEvent) {
                return { success: false, message: "No active event found" };
            }

            // Convert grade to graduatingClassYear
            const graduatingClassYear = getGraduatingClassYear(parseInt(grade), activeEvent.date);

            // Update student record
            const updatedStudent = await prisma.student.update({
                where: { id: studentId },
                data: {
                    firstName,
                    lastName,
                    graduatingClassYear,
                    phone,
                    parentEmail
                },
                    select: { userId: true }
                });

            // Update user info (email and role)
            if (updatedStudent.userId) {
                const finalRole = isInternalTester ? 'INTERNAL_TESTER' : null;
                
                    await prisma.user.update({
                    where: { id: updatedStudent.userId },
                    data: { 
                        email: email || undefined,
                        role: finalRole as UserRole | null
                    }
                });
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
                        where: {
                            position: {
                                eventId: activeEvent.id
                            }
                        },
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
            // Convert graduatingClassYear to grade for filtering and display
            const filteredStudents = students.filter(student => {
                const matchesLastName = !lastNameFilter || 
                    student.lastName.toLowerCase().includes(lastNameFilter.toLowerCase());
                
                // Convert graduatingClassYear to grade for filtering
                const grade = student.graduatingClassYear 
                    ? getCurrentGrade(student.graduatingClassYear, activeEvent.date)
                    : null;
                const matchesGrade = gradeFilter === "All" || 
                    (grade !== null && grade.toString() === gradeFilter);
                
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
                
                // Convert graduatingClassYear to grade for display
                const grade = student.graduatingClassYear 
                    ? getCurrentGrade(student.graduatingClassYear, activeEvent.date)
                    : null;
                
                return {
                    firstName: student.firstName,
                    lastName: student.lastName,
                    grade: grade,
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
    },

    updateCompany: async ({ request, locals }) => {
        if (!locals.user) {
            return { success: false, message: "Not authenticated" };
        }

        const userInfo = await prisma.user.findFirst({
            where: { id: locals.user.id },
            include: { adminOfSchools: true }
        });

        if (!canWriteAdminData(userInfo!)) {
            return { success: false, message: "You do not have permission to edit data" };
        }

        try {
            const formData = await request.formData();
            const companyId = formData.get('companyId')?.toString();
            const companyName = formData.get('companyName')?.toString();
            const companyDescription = formData.get('companyDescription')?.toString();
            const companyUrl = formData.get('companyUrl')?.toString();
            const isInternalTester = formData.get('isInternalTester') === 'true';

            if (!companyId || !companyName || !companyDescription) {
                return { success: false, message: "Missing required fields" };
            }

            // Update company record
            await prisma.company.update({
                where: { id: companyId },
                data: {
                    companyName,
                    companyDescription,
                    companyUrl: companyUrl || null
                }
            });

            // Update all hosts of this company if isInternalTester is set
            // This is a convenience to mark all hosts of a company as testers
            const hosts = await prisma.host.findMany({
                where: { companyId },
                select: { userId: true }
            });

            for (const host of hosts) {
                if (host.userId) {
                    await prisma.user.update({
                        where: { id: host.userId },
                        data: { role: isInternalTester ? 'INTERNAL_TESTER' : null }
                    });
                }
            }

            return { success: true, message: "Company updated successfully" };
        } catch (error) {
            console.error('Error updating company:', error);
            return { success: false, message: "Failed to update company" };
        }
    },

    updateHost: async ({ request, locals }) => {
        if (!locals.user) {
            return { success: false, message: "Not authenticated" };
        }

        const userInfo = await prisma.user.findFirst({
            where: { id: locals.user.id },
            include: { adminOfSchools: true }
        });

        if (!canWriteAdminData(userInfo!)) {
            return { success: false, message: "You do not have permission to edit data" };
        }

        try {
            const formData = await request.formData();
            const hostId = formData.get('hostId')?.toString();
            const name = formData.get('name')?.toString();
            const email = formData.get('email')?.toString();
            const isInternalTester = formData.get('isInternalTester') === 'true';

            if (!hostId || !name || !email) {
                return { success: false, message: "Missing required fields" };
            }

            // Update host record
            const updatedHost = await prisma.host.update({
                where: { id: hostId },
                data: { name },
                select: { userId: true }
            });

            // Update user email and role
            if (updatedHost.userId) {
                await prisma.user.update({
                    where: { id: updatedHost.userId },
                    data: { 
                        email,
                        role: isInternalTester ? 'INTERNAL_TESTER' : null
                    }
                });
            }

            return { success: true, message: "Host updated successfully" };
        } catch (error) {
            console.error('Error updating host:', error);
            return { success: false, message: "Failed to update host" };
        }
    },

    updatePosition: async ({ request, locals }) => {
        if (!locals.user) {
            return { success: false, message: "Not authenticated" };
        }

        const userInfo = await prisma.user.findFirst({
            where: { id: locals.user.id },
            include: { adminOfSchools: true }
        });

        if (!canWriteAdminData(userInfo!)) {
            return { success: false, message: "You do not have permission to edit data" };
        }

        try {
            const formData = await request.formData();
            console.log("[UpdatePosition] Form data keys:", Array.from(formData.keys()));
            
            const positionId = formData.get('positionId')?.toString();
            const title = formData.get('title')?.toString();
            const career = formData.get('career')?.toString();
            const slotsStr = formData.get('slots')?.toString();
            const summary = formData.get('summary')?.toString();
            const contactName = formData.get('contactName')?.toString();
            const contactEmail = formData.get('contactEmail')?.toString();
            const address = formData.get('address')?.toString();
            const instructions = formData.get('instructions')?.toString();
            const attire = formData.get('attire')?.toString();
            const arrival = formData.get('arrival')?.toString();
            const start = formData.get('start')?.toString();
            const end = formData.get('end')?.toString();

            console.log("[UpdatePosition] Values:", { 
                positionId, title, career, slotsStr, contactName 
            });

            if (!positionId || !title || !career || !slotsStr) {
                console.log("[UpdatePosition] Validation failed - missing fields");
                return { success: false, message: "Missing required fields" };
            }

            const slots = parseInt(slotsStr);
            if (isNaN(slots)) {
                console.log("[UpdatePosition] Validation failed - invalid slots:", slotsStr);
                return { success: false, message: "Invalid number of slots" };
            }

            // Update position record
            const updated = await prisma.position.update({
                where: { id: positionId },
                data: {
                    title,
                    career,
                    slots,
                    summary: summary || '',
                    contact_name: contactName || '',
                    contact_email: contactEmail || '',
                    address: address || '',
                    instructions: instructions || '',
                    attire: attire || '',
                    arrival: arrival || '',
                    start: start || '',
                    end: end || '',
                    // If it was already published but didn't have a publishedAt, set it now
                    publishedAt: {
                        set: undefined // Default behavior
                    }
                }
            });

            // If already published but missing publishedAt, backfill it
            const currentPos = await prisma.position.findUnique({
                where: { id: positionId },
                select: { isPublished: true, publishedAt: true }
            });
            
            if (currentPos?.isPublished && !currentPos.publishedAt) {
                await prisma.position.update({
                    where: { id: positionId },
                    data: { publishedAt: new Date() }
                });
            }

            console.log("[UpdatePosition] Update successful for:", updated.id);

            return { success: true, message: "Position updated successfully" };
        } catch (error) {
            console.error('[UpdatePosition] Error:', error);
            return { success: false, message: "Failed to update position" };
        }
    },

    publishPositionAsAdmin: async ({ request, locals }) => {
        if (!locals.user) {
            return { success: false, message: "Not authenticated" };
        }

        const userInfo = await prisma.user.findFirst({
            where: { id: locals.user.id },
            include: { adminOfSchools: true }
        });

        if (!canWriteAdminData(userInfo!)) {
            return { success: false, message: "You do not have permission to edit data" };
        }

        try {
            const formData = await request.formData();
            const positionId = formData.get('positionId')?.toString();
            const title = formData.get('title')?.toString();
            const career = formData.get('career')?.toString();
            const slotsStr = formData.get('slots')?.toString();
            const summary = formData.get('summary')?.toString();
            const contactName = formData.get('contactName')?.toString();
            const contactEmail = formData.get('contactEmail')?.toString();
            const address = formData.get('address')?.toString();
            const instructions = formData.get('instructions')?.toString();
            const attire = formData.get('attire')?.toString();
            const arrival = formData.get('arrival')?.toString();
            const start = formData.get('start')?.toString();
            const end = formData.get('end')?.toString();

            if (!positionId || !title || !career || !slotsStr) {
                return { success: false, message: "Missing required fields" };
            }

            const slots = parseInt(slotsStr);
            if (isNaN(slots)) {
                return { success: false, message: "Invalid number of slots" };
            }

            // 1. Fetch current position info to get host and event details
            const position = await prisma.position.findUnique({
                where: { id: positionId },
                include: {
                    host: {
                        include: {
                            user: true
                        }
                    },
                    event: {
                        include: {
                            school: true
                        }
                    },
                    attachments: true
                }
            });

            if (!position) {
                return { success: false, message: "Position not found" };
            }

            const now = new Date();

            // 2. Perform updates in a transaction
            await prisma.$transaction([
                // Update position
                prisma.position.update({
                    where: { id: positionId },
                    data: {
                        title,
                        career,
                        slots,
                        summary: summary || '',
                        contact_name: contactName || '',
                        contact_email: contactEmail || '',
                        address: address || '',
                        instructions: instructions || '',
                        attire: attire || '',
                        arrival: arrival || '',
                        start: start || '',
                        end: end || '',
                        isPublished: true,
                        publishedAt: now
                    }
                }),
                // Update host's user record to simulate participation
                prisma.user.update({
                    where: { id: position.host.userId },
                    data: {
                        lastLogin: now,
                        emailVerified: true
                    }
                })
            ]);

            // 3. Send confirmation emails
            const eventData = {
                eventName: position.event.name || 'JobCamp',
                eventDate: formatEmailDate(position.event.date),
                schoolName: position.event.school.name,
                schoolId: position.event.school.id
            };

            try {
                await sendPositionUpdateEmail(position.host.user.email, {
                    title,
                    career,
                    slots: slots.toString(),
                    summary: summary || '',
                    contact_name: contactName || '',
                    contact_email: contactEmail || '',
                    address: address || 'Not provided',
                    instructions: instructions || 'Not provided',
                    attire: attire || 'Not provided',
                    arrival: arrival || 'Not provided',
                    start: start || 'Not provided',
                    end: end || 'Not provided',
                    attachmentCount: position.attachments.length.toString(),
                }, eventData, position.event.date);
            } catch (emailError) {
                console.error('[PublishAsAdmin] Email error:', emailError);
                // Don't fail the whole action if email fails
            }

            return { success: true, message: "Position published successfully as admin" };
        } catch (error) {
            console.error('[PublishAsAdmin] Error:', error);
            return { success: false, message: "Failed to publish position" };
        }
    },

    createPosition: async ({ request, locals }) => {
        if (!locals.user) {
            return { success: false, message: "Not authenticated" };
        }

        const userInfo = await prisma.user.findFirst({
            where: { id: locals.user.id },
            include: { adminOfSchools: true }
        });

        if (!canWriteAdminData(userInfo!)) {
            return { success: false, message: "You do not have permission to create positions" };
        }

        try {
            // Check if user is admin
            const userInfo = await prisma.user.findFirst({
                where: { id: locals.user.id },
                include: { adminOfSchools: true }
            });

            if (!userInfo?.adminOfSchools?.length) {
                return { success: false, message: "Not authorized" };
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
                return { success: false, message: "No active event found" };
            }

            const formData = await request.formData();
            const hostId = formData.get('hostId')?.toString();
            const title = formData.get('title')?.toString();
            const career = formData.get('career')?.toString();
            const slots = formData.get('slots')?.toString();
            const summary = formData.get('summary')?.toString();
            const contactName = formData.get('contactName')?.toString();
            const contactEmail = formData.get('contactEmail')?.toString();
            const address = formData.get('address')?.toString();
            const instructions = formData.get('instructions')?.toString();
            const attire = formData.get('attire')?.toString();
            const arrival = formData.get('arrival')?.toString();
            const start = formData.get('start')?.toString();
            const end = formData.get('end')?.toString();

            if (!title || !career || !slots) {
                return { success: false, message: "Missing required fields" };
            }

            // Use provided hostId or fallback to admin host
            let finalHostId = hostId;
            if (!finalHostId) {
                const adminHost = await getOrCreateAdminHost(activeEvent.schoolId);
                finalHostId = adminHost.id;
            }

            // Create the position
            await prisma.position.create({
                data: {
                    title,
                    career,
                    slots: parseInt(slots),
                    summary: summary || '',
                    contact_name: contactName || 'admin@jobcamp.org',
                    contact_email: contactEmail || 'admin@jobcamp.org',
                    address: address || '',
                    instructions: instructions || '',
                    attire: attire || '',
                    arrival: arrival || '',
                    start: start || '',
                    end: end || '',
                    eventId: activeEvent.id,
                    hostId: finalHostId,
                    isPublished: false
                }
            });

            return { success: true, message: "Position created successfully" };
        } catch (error) {
            console.error('Error creating position:', error);
            return { success: false, message: "Failed to create position" };
        }
    },

    previewFilteredStudents: async ({ request, locals }) => {
        if (!locals.user) {
            return { success: false, message: "Not authenticated" };
        }

        // Check if user has full admin access (messaging requires full admin)
        const userInfo = await prisma.user.findFirst({
            where: { id: locals.user.id },
            include: { adminOfSchools: true }
        });

        if (!canAccessFullAdminFeatures(userInfo!)) {
            return { success: false, message: "You do not have permission to send messages" };
        }

        try {
            const formData = await request.formData();
            const studentIdsJson = formData.get('studentIds')?.toString();
            const messageType = formData.get('messageType')?.toString();
            const includeParents = formData.get('includeParents') === 'on';

            if (!studentIdsJson) {
                return { success: false, message: "No students selected" };
            }

            const studentIds = JSON.parse(studentIdsJson);

            if (!Array.isArray(studentIds) || studentIds.length === 0) {
                return { success: false, message: "No students selected" };
            }

            // Fetch students by IDs
            const students = await prisma.student.findMany({
                where: {
                    id: { in: studentIds },
                    isActive: true
                },
                include: {
                    user: {
                        select: {
                            email: true
                        }
                    }
                }
            });

            if (students.length === 0) {
                return { success: false, message: "No valid students found" };
            }

            // Build preview list
            const preview = [];

            if (messageType === 'email') {
                // Add student emails
                for (const student of students) {
                    if (student.user?.email) {
                        preview.push({
                            name: `${student.firstName} ${student.lastName}`,
                            email: student.user.email
                        });
                    }
                }

                // Add parent emails if requested
                if (includeParents) {
                    for (const student of students) {
                        if (student.parentEmail) {
                            preview.push({
                                name: `${student.firstName} ${student.lastName} (Parent)`,
                                email: student.parentEmail
                            });
                        }
                    }
                }
            } else if (messageType === 'sms') {
                // Add student phone numbers
                for (const student of students) {
                    if (student.phone) {
                        preview.push({
                            name: `${student.firstName} ${student.lastName}`,
                            phone: student.phone
                        });
                    }
                }
            }

            return {
                success: true,
                count: preview.length,
                preview: preview.slice(0, 50) // Limit preview to 50 for performance
            };
        } catch (error) {
            console.error('Error previewing recipients:', error);
            return { success: false, message: "Failed to preview recipients" };
        }
    },

    sendToFilteredStudents: async ({ request, locals }) => {
        if (!locals.user) {
            return { success: false, message: "Not authenticated" };
        }

        // Check if user has full admin access (messaging requires full admin)
        const userInfo = await prisma.user.findFirst({
            where: { id: locals.user.id },
            include: { adminOfSchools: true }
        });

        if (!canAccessFullAdminFeatures(userInfo!)) {
            return { success: false, message: "You do not have permission to send messages" };
        }

        try {
            const formData = await request.formData();
            const studentIdsJson = formData.get('studentIds')?.toString();
            const messageType = formData.get('messageType')?.toString();
            const includeParents = formData.get('includeParents') === 'on';
            const subject = formData.get('subject')?.toString();
            const message = formData.get('message')?.toString();

            if (!studentIdsJson) {
                return { success: false, message: "No students selected" };
            }

            if (!message) {
                return { success: false, message: "Message is required" };
            }

            if (messageType === 'email' && !subject) {
                return { success: false, message: "Subject is required for emails" };
            }

            const studentIds = JSON.parse(studentIdsJson);

            if (!Array.isArray(studentIds) || studentIds.length === 0) {
                return { success: false, message: "No students selected" };
            }

            // Fetch students by IDs
            const students = await prisma.student.findMany({
                where: {
                    id: { in: studentIds },
                    isActive: true
                },
                include: {
                    user: {
                        select: {
                            email: true
                        }
                    }
                }
            });

            if (students.length === 0) {
                return { success: false, message: "No valid students found" };
            }

            let successCount = 0;
            let failCount = 0;

            if (messageType === 'email') {
                const emailRecipients: Array<{email: string, name: string}> = [];

                // Add student emails
                for (const student of students) {
                    if (student.user?.email) {
                        emailRecipients.push({
                            email: student.user.email,
                            name: `${student.firstName} ${student.lastName}`
                        });
                    }
                }

                // Add parent emails if requested
                if (includeParents) {
                    for (const student of students) {
                        if (student.parentEmail) {
                            emailRecipients.push({
                                email: student.parentEmail,
                                name: `${student.firstName} ${student.lastName} (Parent)`
                            });
                        }
                    }
                }

                if (emailRecipients.length === 0) {
                    return { success: false, message: 'No valid email addresses found' };
                }

                const result = await sendBulkEmail({
                    to: emailRecipients,
                    subject: subject!,
                    html: message.replace(/\n/g, '<br>')
                });
                if (result.success) {
                    successCount = emailRecipients.length;
                } else {
                    return { success: false, message: result.error || 'Failed to send emails' };
                }
            } else if (messageType === 'sms') {
                // All students have agreed to SMS by signing up, just check for phone numbers
                const smsRecipients = students
                    .filter(s => s.phone)
                    .map(s => s.phone);

                if (smsRecipients.length === 0) {
                    return { success: false, message: 'No students have phone numbers' };
                }

                const result = await sendBulkSMS(smsRecipients, message);
                successCount = result.sent;
                failCount = result.failed;

                if (failCount > 0) {
                    return { 
                        success: true, 
                        message: `Sent ${successCount} SMS, ${failCount} failed`,
                        count: successCount
                    };
                }
            }

            return {
                success: true,
                message: `Successfully sent ${messageType === 'email' ? 'emails' : 'SMS messages'}`,
                count: successCount
            };
        } catch (error) {
            console.error('Error sending messages:', error);
            return { success: false, message: "Failed to send messages" };
        }
    },

    previewFilteredCompanies: async ({ request, locals }) => {
        if (!locals.user) {
            return { success: false, message: "Not authenticated" };
        }

        const userInfo = await prisma.user.findFirst({
            where: { id: locals.user.id },
            include: { adminOfSchools: true }
        });

        if (!canAccessFullAdminFeatures(userInfo!)) {
            return { success: false, message: "You do not have permission to send messages" };
        }

        try {
            const formData = await request.formData();
            const companyIdsJson = formData.get('companyIds')?.toString();

            if (!companyIdsJson) {
                return { success: false, message: "No companies selected" };
            }

            const companyIds = JSON.parse(companyIdsJson);

            if (!Array.isArray(companyIds) || companyIds.length === 0) {
                return { success: false, message: "No companies selected" };
            }

            const schoolIds = userInfo!.adminOfSchools.map(s => s.id);
            const activeEvent = await prisma.event.findFirst({
                where: { schoolId: { in: schoolIds }, isActive: true }
            });

            if (!activeEvent) {
                return { success: false, message: "No active event found" };
            }

            // Fetch hosts and positions for these companies
            const companies = await prisma.company.findMany({
                where: { id: { in: companyIds } },
                include: {
                    hosts: {
                        include: { user: { select: { email: true } } }
                    },
                    prefillSettings: {
                        where: { position: { eventId: activeEvent.id } },
                        include: { position: true }
                    }
                }
            });

            // We also need to get positions directly because some might not have prefill settings
            const positions = await prisma.position.findMany({
                where: {
                    eventId: activeEvent.id,
                    host: { companyId: { in: companyIds } }
                },
                include: { host: true }
            });

            const recipientsMap = new Map<string, { name: string, email: string, role: string }>();

            for (const company of companies) {
                for (const host of company.hosts) {
                    if (host.user?.email) {
                        recipientsMap.set(host.user.email.toLowerCase(), {
                            name: host.name,
                            email: host.user.email,
                            role: 'Host'
                        });
                    }
                }
            }

            for (const pos of positions) {
                if (pos.contact_email) {
                    const email = pos.contact_email.toLowerCase();
                    if (!recipientsMap.has(email)) {
                        recipientsMap.set(email, {
                            name: pos.contact_name || 'Contact',
                            email: pos.contact_email,
                            role: 'Contact'
                        });
                    }
                }
            }

            const recipients = Array.from(recipientsMap.values());

            return {
                success: true,
                count: recipients.length,
                preview: recipients.slice(0, 50)
            };
        } catch (error) {
            console.error('Error previewing company recipients:', error);
            return { success: false, message: "Failed to preview recipients" };
        }
    },

    sendToFilteredCompanies: async ({ request, locals }) => {
        if (!locals.user) {
            return { success: false, message: "Not authenticated" };
        }

        const userInfo = await prisma.user.findFirst({
            where: { id: locals.user.id },
            include: { adminOfSchools: true }
        });

        if (!canAccessFullAdminFeatures(userInfo!)) {
            return { success: false, message: "You do not have permission to send messages" };
        }

        try {
            const formData = await request.formData();
            const companyIdsJson = formData.get('companyIds')?.toString();
            const subject = formData.get('subject')?.toString();
            const message = formData.get('message')?.toString();

            if (!companyIdsJson || !subject || !message) {
                return { success: false, message: "Missing required fields" };
            }

            const companyIds = JSON.parse(companyIdsJson);

            if (!Array.isArray(companyIds) || companyIds.length === 0) {
                return { success: false, message: "No companies selected" };
            }

            const schoolIds = userInfo!.adminOfSchools.map(s => s.id);
            const activeEvent = await prisma.event.findFirst({
                where: { schoolId: { in: schoolIds }, isActive: true }
            });

            if (!activeEvent) {
                return { success: false, message: "No active event found" };
            }

            // Fetch hosts and positions for these companies
            const companies = await prisma.company.findMany({
                where: { id: { in: companyIds } },
                include: {
                    hosts: {
                        include: { user: { select: { email: true } } }
                    }
                }
            });

            const positions = await prisma.position.findMany({
                where: {
                    eventId: activeEvent.id,
                    host: { companyId: { in: companyIds } }
                }
            });

            const emailRecipientsMap = new Map<string, { name: string, email: string }>();

            for (const company of companies) {
                for (const host of company.hosts) {
                    if (host.user?.email) {
                        emailRecipientsMap.set(host.user.email.toLowerCase(), {
                            email: host.user.email,
                            name: host.name
                        });
                    }
                }
            }

            for (const pos of positions) {
                if (pos.contact_email) {
                    const email = pos.contact_email.toLowerCase();
                    if (!emailRecipientsMap.has(email)) {
                        emailRecipientsMap.set(email, {
                            email: pos.contact_email,
                            name: pos.contact_name || 'Contact'
                        });
                    }
                }
            }

            const emailRecipients = Array.from(emailRecipientsMap.values());

            if (emailRecipients.length === 0) {
                return { success: false, message: 'No valid email addresses found' };
            }

            const result = await sendBulkEmail({
                to: emailRecipients,
                subject: subject!,
                html: message.replace(/\n/g, '<br>')
            });

            if (result.success) {
                // Log the message
                await prisma.message.create({
                    data: {
                        senderId: locals.user.id,
                        senderEmail: userInfo!.email,
                        schoolId: schoolIds[0],
                        eventId: activeEvent.id,
                        messageType: 'EMAIL',
                        recipientType: 'COMPANIES_ALL', // Or INDIVIDUAL_COMPANY if appropriate
                        recipientCount: emailRecipients.length,
                        subject: subject,
                        status: 'sent'
                    }
                });

                return {
                    success: true,
                    message: "Emails sent successfully",
                    count: emailRecipients.length
                };
            } else {
                return { success: false, message: result.error || 'Failed to send emails' };
            }
        } catch (error) {
            console.error('Error sending messages to companies:', error);
            return { success: false, message: "Failed to send messages" };
        }
    }
};
