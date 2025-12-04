import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { getCurrentGrade } from '$lib/server/gradeUtils';

export const GET: RequestHandler = async ({ url, locals }) => {
    if (!locals.user) {
        return new Response("Not authenticated", { status: 401 });
    }

    try {
        // Get entity type from URL (defaults to students for backward compatibility)
        const entityType = url.searchParams.get('type') || 'students';

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

        // Route to appropriate export handler based on entity type
        switch (entityType) {
            case 'companies':
                return await exportCompanies(schoolIds, url);
            case 'hosts':
                return await exportHosts(schoolIds, url);
            case 'positions':
                return await exportPositions(activeEvent.id, url);
            case 'students':
            default:
                return await exportStudents(schoolIds, activeEvent, url);
        }
    } catch (error) {
        console.error(`Error exporting ${url.searchParams.get('type') || 'students'}:`, error);
        return new Response(`Failed to export ${url.searchParams.get('type') || 'students'}`, { status: 500 });
    }
};

async function exportStudents(schoolIds: string[], activeEvent: { id: string; date: Date }, url: URL) {
    // Get filter parameters from URL
    const lastNameFilter = url.searchParams.get('lastName') || '';
    const gradeFilter = url.searchParams.get('grade') || 'All';
    const permissionSlipFilter = url.searchParams.get('permissionSlip') || 'All';
    const lotteryStatusFilter = url.searchParams.get('lotteryStatus') || 'All';

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
}

async function exportCompanies(schoolIds: string[], url: URL) {
    // Get filter parameters from URL
    const companyNameFilter = url.searchParams.get('companyName') || '';

    // Get companies
    const companies = await prisma.company.findMany({
        where: {
            schoolId: { in: schoolIds }
        },
        include: {
            hosts: {
                include: {
                    positions: {
                        where: {
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

    // Transform and filter companies
    const filteredCompanies = companies.filter(company => {
        const matchesCompanyName = !companyNameFilter || 
            company.companyName.toLowerCase().includes(companyNameFilter.toLowerCase());
        return matchesCompanyName;
    }).map(company => {
        // Count active positions for this company
        const positionCount = company.hosts.reduce((count, host) => {
            return count + host.positions.length;
        }, 0);

        return {
            companyName: company.companyName,
            companyDescription: company.companyDescription || '',
            companyUrl: company.companyUrl || '',
            activePositionCount: positionCount
        };
    });

    // Generate CSV
    const headers = ['Company Name', 'Description', 'URL', 'Active Positions'];
    const csvRows = [
        headers.join(','),
        ...filteredCompanies.map(company => [
            `"${company.companyName}"`,
            `"${company.companyDescription}"`,
            `"${company.companyUrl}"`,
            company.activePositionCount
        ].join(','))
    ];

    const csvContent = csvRows.join('\n');

    // Return CSV file
    return new Response(csvContent, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="companies-${new Date().toISOString().split('T')[0]}.csv"`
        }
    });
}

async function exportHosts(schoolIds: string[], url: URL) {
    // Get filter parameters from URL
    const hostNameFilter = url.searchParams.get('hostName') || '';

    // Get hosts
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

    // Transform and filter hosts
    const filteredHosts = hosts.filter(host => {
        const matchesHostName = !hostNameFilter || 
            host.name.toLowerCase().includes(hostNameFilter.toLowerCase());
        return matchesHostName;
    }).map(host => {
        return {
            name: host.name,
            email: host.user.email || '',
            companyName: host.company?.companyName || 'No Company',
            lastLogin: host.user.lastLogin ? new Date(host.user.lastLogin).toISOString() : 'Never'
        };
    });

    // Generate CSV
    const headers = ['Name', 'Email', 'Company', 'Last Login'];
    const csvRows = [
        headers.join(','),
        ...filteredHosts.map(host => [
            `"${host.name}"`,
            `"${host.email}"`,
            `"${host.companyName}"`,
            `"${host.lastLogin}"`
        ].join(','))
    ];

    const csvContent = csvRows.join('\n');

    // Return CSV file
    return new Response(csvContent, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="hosts-${new Date().toISOString().split('T')[0]}.csv"`
        }
    });
}

async function exportPositions(eventId: string, url: URL) {
    // Get filter parameters from URL
    const positionTitleFilter = url.searchParams.get('positionTitle') || '';
    const positionCareerFilter = url.searchParams.get('positionCareer') || 'All';

    // Get positions for the active event
    const positions = await prisma.position.findMany({
        where: {
            eventId: eventId
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
            }
        },
        orderBy: {
            title: 'asc'
        }
    });

    // Transform and filter positions
    const filteredPositions = positions.filter(position => {
        const matchesTitle = !positionTitleFilter || 
            position.title.toLowerCase().includes(positionTitleFilter.toLowerCase());
        
        const matchesCareer = positionCareerFilter === "All" || 
            position.career === positionCareerFilter;
        
        return matchesTitle && matchesCareer;
    }).map(position => {
        return {
            title: position.title,
            career: position.career,
            slots: position.slots,
            summary: position.summary || '',
            contactName: position.contact_name || '',
            contactEmail: position.contact_email || '',
            address: position.address || '',
            instructions: position.instructions || '',
            attire: position.attire || '',
            arrival: position.arrival || '',
            start: position.start || '',
            end: position.end || '',
            hostName: position.host.name,
            companyName: position.host.company?.companyName || 'No Company',
            isPublished: position.isPublished ? 'Published' : 'Draft',
            createdAt: position.createdAt ? new Date(position.createdAt).toISOString() : ''
        };
    });

    // Generate CSV
    const headers = ['Title', 'Career', 'Slots', 'Summary', 'Contact Name', 'Contact Email', 'Address', 'Instructions', 'Attire', 'Arrival', 'Start', 'End', 'Host Name', 'Company', 'Status', 'Created At'];
    const csvRows = [
        headers.join(','),
        ...filteredPositions.map(position => [
            `"${position.title}"`,
            `"${position.career}"`,
            position.slots,
            `"${position.summary}"`,
            `"${position.contactName}"`,
            `"${position.contactEmail}"`,
            `"${position.address}"`,
            `"${position.instructions}"`,
            `"${position.attire}"`,
            `"${position.arrival}"`,
            `"${position.start}"`,
            `"${position.end}"`,
            `"${position.hostName}"`,
            `"${position.companyName}"`,
            `"${position.isPublished}"`,
            `"${position.createdAt}"`
        ].join(','))
    ];

    const csvContent = csvRows.join('\n');

    // Return CSV file
    return new Response(csvContent, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="positions-${new Date().toISOString().split('T')[0]}.csv"`
        }
    });
}

