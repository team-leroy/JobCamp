import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { careers } from '$lib/appconfig';
import { scrypt } from '$lib/server/hash';
import crypto from 'node:crypto';
import { getCurrentGrade, getGraduatingClassYear } from '$lib/server/gradeUtils';

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
            isHost: !!locals.user.host
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
        const permissionSlip = student.permissionSlips[0];
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

    // Get companies from the active event's school
    const companies = await prisma.company.findMany({
        where: {
            schoolId: { in: schoolIds }
        },
        include: {
            hosts: {
                include: {
                    positions: {
                        where: {
                            eventId: activeEvent.id,
                            isPublished: true
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
        // Count active positions for this company in the current event
        const positionCount = company.hosts.reduce((count, host) => {
            return count + host.positions.length;
        }, 0);

        return {
            id: company.id,
            companyName: company.companyName,
            companyDescription: company.companyDescription,
            companyUrl: company.companyUrl || '',
            activePositionCount: positionCount
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
                    lastLogin: true
                }
            },
            company: {
                select: {
                    companyName: true
                }
            }
        },
        orderBy: {
            name: 'asc'
        }
    });

    // Transform host data for the UI
    const transformedHosts = hosts.map(host => {
        return {
            id: host.id,
            name: host.name,
            email: host.user.email,
            lastLogin: host.user.lastLogin,
            companyName: host.company?.companyName || 'No Company'
        };
    });

    // Get positions for the active event
    const eventPositions = await prisma.position.findMany({
        where: {
            eventId: activeEvent.id
        },
        include: {
            host: {
                include: {
                    company: {
                        select: {
                            companyName: true
                        }
                    },
                    user: {
                        select: {
                            email: true
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
    const transformedPositions = eventPositions.map(position => {
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
            createdAt: position.createdAt,
            hostName: position.host.name,
            companyName: position.host.company?.companyName || 'No Company',
            isPublished: position.isPublished
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
        isHost: !!locals.user.host
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

            // Get active event to convert grade to graduatingClassYear
            const userInfo = await prisma.user.findFirst({
                where: { id: locals.user.id },
                include: { adminOfSchools: true }
            });

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
            await prisma.student.update({
                where: { id: studentId },
                data: {
                    firstName,
                    lastName,
                    graduatingClassYear,
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

        try {
            const formData = await request.formData();
            const companyId = formData.get('companyId')?.toString();
            const companyName = formData.get('companyName')?.toString();
            const companyDescription = formData.get('companyDescription')?.toString();
            const companyUrl = formData.get('companyUrl')?.toString();

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

        try {
            const formData = await request.formData();
            const hostId = formData.get('hostId')?.toString();
            const name = formData.get('name')?.toString();
            const email = formData.get('email')?.toString();

            if (!hostId || !name || !email) {
                return { success: false, message: "Missing required fields" };
            }

            // Update host name
            const host = await prisma.host.findUnique({
                where: { id: hostId },
                select: { userId: true }
            });

            if (!host) {
                return { success: false, message: "Host not found" };
            }

            await prisma.host.update({
                where: { id: hostId },
                data: { name }
            });

            // Update user email
            await prisma.user.update({
                where: { id: host.userId },
                data: { email }
            });

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

        try {
            const formData = await request.formData();
            const positionId = formData.get('positionId')?.toString();
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

            if (!positionId || !title || !career || !slots) {
                return { success: false, message: "Missing required fields" };
            }

            // Update position record
            await prisma.position.update({
                where: { id: positionId },
                data: {
                    title,
                    career,
                    slots: parseInt(slots),
                    summary: summary || '',
                    contact_name: contactName || '',
                    contact_email: contactEmail || '',
                    address: address || '',
                    instructions: instructions || '',
                    attire: attire || '',
                    arrival: arrival || '',
                    start: start || '',
                    end: end || ''
                }
            });

            return { success: true, message: "Position updated successfully" };
        } catch (error) {
            console.error('Error updating position:', error);
            return { success: false, message: "Failed to update position" };
        }
    },

    createPosition: async ({ request, locals }) => {
        if (!locals.user) {
            return { success: false, message: "Not authenticated" };
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

            // Get or create admin host
            const adminHost = await getOrCreateAdminHost(activeEvent.schoolId);

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
                    hostId: adminHost.id,
                    isPublished: false
                }
            });

            return { success: true, message: "Position created successfully" };
        } catch (error) {
            console.error('Error creating position:', error);
            return { success: false, message: "Failed to create position" };
        }
    }
};
