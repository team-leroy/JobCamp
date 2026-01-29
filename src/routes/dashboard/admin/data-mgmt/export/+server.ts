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
                return await exportPositions(schoolIds, url);
            case 'lottery-results':
                return await exportLotteryResults(schoolIds, activeEvent);
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
    const emailVerifiedFilter = url.searchParams.get('emailVerified') || 'All';
    const eventIdFilter = url.searchParams.get('eventId') || 'All';
    const showTesters = url.searchParams.get('showTesters') === 'true';

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
                
                const matchesEmailVerified = emailVerifiedFilter === "All" || 
                    (emailVerifiedFilter === "Verified" && student.user?.emailVerified) || 
                    (emailVerifiedFilter === "Unverified" && !student.user?.emailVerified);
                
                const studentEventIds = student.eventParticipation.map(p => p.eventId);
                const matchesEvent = eventIdFilter === "All" || studentEventIds.includes(eventIdFilter);

                const matchesTester = showTesters || student.user?.role !== 'INTERNAL_TESTER';

                return matchesLastName && matchesGrade && matchesPermissionSlip && matchesLotteryStatus && matchesEmailVerified && matchesEvent && matchesTester;
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
                emailVerified: student.user.emailVerified ? 'Yes' : 'No',
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
        const headers = ['First Name', 'Last Name', 'Grade', 'Phone', 'Email', 'Email Verified', 'Parent Email', 'Permission Slip Status', 'Last Login', 'Student Picks', 'Lottery Assignment'];
        const csvRows = [
            headers.join(','),
            ...filteredStudents.map(student => [
                `"${student.firstName}"`,
                `"${student.lastName}"`,
                student.grade,
                `"${student.phone}"`,
                `"${student.email}"`,
                `"${student.emailVerified}"`,
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
    const emailVerifiedFilter = url.searchParams.get('emailVerified') || 'All';
    const eventIdFilter = url.searchParams.get('eventId') || 'All';
    const positionStatusFilter = url.searchParams.get('positionStatus') || 'All';
    const showTesters = url.searchParams.get('showTesters') === 'true';

    // Get active event for position count and login check
    const activeEvent = await prisma.event.findFirst({
        where: {
            schoolId: { in: schoolIds },
            isActive: true
        },
        select: {
            id: true,
            createdAt: true
        }
    });

    // Get companies
    const companies = await prisma.company.findMany({
        where: {
            schoolId: { in: schoolIds }
        },
        include: {
            hosts: {
                include: {
                    user: {
                        select: {
                            lastLogin: true,
                            role: true,
                            emailVerified: true
                        }
                    },
                    positions: {
                        select: {
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

    // Transform and filter companies
    const filteredCompanies = companies.map(company => {
        const participatedEventIds = new Set<string>();
        let activePositionCount = 0;
        let activeSlotsCount = 0;
        let hasAnyActivePosition = false;
        let hasPublishedActivePosition = false;
        let hasDraftActivePosition = false;

        company.hosts.forEach(host => {
            // 1. Add events where they have any position (published or draft)
            host.positions.forEach(pos => {
                participatedEventIds.add(pos.eventId);
                
                if (activeEvent && pos.eventId === activeEvent.id) {
                    hasAnyActivePosition = true;
                    if (pos.isPublished) {
                        hasPublishedActivePosition = true;
                        activePositionCount++;
                        activeSlotsCount += pos.slots;
                    } else {
                        hasDraftActivePosition = true;
                    }
                }
            });

            // 2. Add the active event if they have logged in since it was created
            if (activeEvent && host.user?.lastLogin) {
                const lastLoginTime = new Date(host.user.lastLogin).getTime();
                const eventCreatedTime = new Date(activeEvent.createdAt).getTime();
                
                if (lastLoginTime >= eventCreatedTime) {
                    participatedEventIds.add(activeEvent.id);
                }
            }
        });

        // A company is an internal tester company if it has hosts and all its hosts are internal testers
        const isInternalTester = company.hosts.length > 0 && company.hosts.every(h => h.user?.role === 'INTERNAL_TESTER');

        // A company has a verified host if any of its hosts are verified
        const emailVerified = company.hosts.some(h => h.user?.emailVerified);

        return {
            companyName: company.companyName,
            companyDescription: company.companyDescription || '',
            companyUrl: company.companyUrl || '',
            activePositionCount,
            activeSlotsCount,
            isInternalTester,
            emailVerified,
            eventIds: Array.from(participatedEventIds),
            hasAnyActivePosition,
            hasPublishedActivePosition,
            hasDraftActivePosition
        };
    }).filter(company => {
        const matchesCompanyName = !companyNameFilter || 
            company.companyName.toLowerCase().includes(companyNameFilter.toLowerCase());
        
        const matchesEmailVerified = emailVerifiedFilter === "All" || 
            (emailVerifiedFilter === "Verified" && company.emailVerified) || 
            (emailVerifiedFilter === "Unverified" && !company.emailVerified);
        
        const matchesEvent = eventIdFilter === "All" || company.eventIds.includes(eventIdFilter);

        const matchesStatus = positionStatusFilter === "All" || 
            (positionStatusFilter === "Published" && company.hasPublishedActivePosition) || 
            (positionStatusFilter === "Draft" && company.hasDraftActivePosition) ||
            (positionStatusFilter === "No Position" && !company.hasAnyActivePosition);

        const matchesTester = showTesters || !company.isInternalTester;

        return matchesCompanyName && matchesEmailVerified && matchesEvent && matchesStatus && matchesTester;
    });

    // Generate CSV
    const headers = ['Company Name', 'Description', 'URL', 'Email Verified', 'Active Positions', 'Active Slots'];
    const csvRows = [
        headers.join(','),
        ...filteredCompanies.map(company => [
            `"${company.companyName}"`,
            `"${company.companyDescription}"`,
            `"${company.companyUrl}"`,
            company.emailVerified ? 'Yes' : 'No',
            company.activePositionCount,
            company.activeSlotsCount
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
    const emailVerifiedFilter = url.searchParams.get('emailVerified') || 'All';
    const eventIdFilter = url.searchParams.get('eventId') || 'All';
    const showTesters = url.searchParams.get('showTesters') === 'true';

    // Get active event for login check
    const activeEvent = await prisma.event.findFirst({
        where: {
            schoolId: { in: schoolIds },
            isActive: true
        },
        select: {
            id: true,
            createdAt: true
        }
    });

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

    // Transform and filter hosts
    const filteredHosts = hosts.map(host => {
        const participatedEventIds = new Set<string>();
        
        // 1. Add events where they have a published position
        host.positions.forEach(pos => {
            if (pos.isPublished) {
                participatedEventIds.add(pos.eventId);
            }
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
            name: host.name,
            email: host.user?.email || '',
            emailVerified: host.user?.emailVerified,
            companyName: host.company?.companyName || 'No Company',
            lastLogin: host.user?.lastLogin ? new Date(host.user.lastLogin).toISOString() : 'Never',
            userRole: host.user?.role,
            eventIds: Array.from(participatedEventIds)
        };
    }).filter(host => {
        const matchesHostName = !hostNameFilter || 
            host.name.toLowerCase().includes(hostNameFilter.toLowerCase());
        
        const matchesEmailVerified = emailVerifiedFilter === "All" || 
            (emailVerifiedFilter === "Verified" && host.emailVerified) || 
            (emailVerifiedFilter === "Unverified" && !host.emailVerified);
        
        const matchesEvent = eventIdFilter === "All" || host.eventIds.includes(eventIdFilter);
        
        const matchesTester = showTesters || host.userRole !== 'INTERNAL_TESTER';

        return matchesHostName && matchesEmailVerified && matchesEvent && matchesTester;
    }).map(host => {
        return {
            name: host.name,
            email: host.email || '',
            emailVerified: host.emailVerified ? 'Yes' : 'No',
            companyName: host.companyName || 'No Company',
            lastLogin: host.lastLogin || 'Never'
        };
    });

    // Generate CSV
    const headers = ['Name', 'Email', 'Email Verified', 'Company', 'Last Login'];
    const csvRows = [
        headers.join(','),
        ...filteredHosts.map(host => [
            `"${host.name}"`,
            `"${host.email}"`,
            `"${host.emailVerified}"`,
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

async function exportPositions(schoolIds: string[], url: URL) {
    // Get filter parameters from URL
    const positionTitleFilter = url.searchParams.get('positionTitle') || '';
    const positionCareerFilter = url.searchParams.get('positionCareer') || 'All';
    const positionStatusFilter = url.searchParams.get('positionStatus') || 'All';
    const eventIdFilter = url.searchParams.get('eventId') || 'All';
    const showTesters = url.searchParams.get('showTesters') === 'true';

    // Get positions for all events in these schools
    const positions = await prisma.position.findMany({
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

        const matchesEvent = eventIdFilter === "All" || position.eventId === eventIdFilter;

        const matchesStatus = positionStatusFilter === "All" || 
            (positionStatusFilter === "Published" && position.isPublished) || 
            (positionStatusFilter === "Draft" && !position.isPublished);
        
        const matchesTester = showTesters || position.host?.user?.role !== 'INTERNAL_TESTER';
        
        return matchesTitle && matchesCareer && matchesEvent && matchesStatus && matchesTester;
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

async function exportLotteryResults(schoolIds: string[], activeEvent: { id: string; date: Date }) {
    // Find the most recent lottery job for this event
    const latestJob = await prisma.lotteryJob.findFirst({
        where: { 
            status: 'COMPLETED',
            eventId: activeEvent.id
        },
        orderBy: { completedAt: 'desc' }
    });

    if (!latestJob) {
        return new Response("No completed lottery found for the active event", { status: 404 });
    }

    // Get all results for this job
    const results = await prisma.lotteryResults.findMany({
        where: {
            lotteryJobId: latestJob.id
        },
        include: {
            student: {
                include: {
                    positionsSignedUpFor: {
                        where: {
                            position: {
                                eventId: activeEvent.id
                            }
                        },
                        orderBy: { rank: 'asc' }
                    }
                }
            },
            position: {
                include: {
                    host: {
                        include: {
                            company: true
                        }
                    }
                }
            }
        }
    });

    // Format for CSV
    const csvData = results.map(result => {
        const grade = result.student.graduatingClassYear 
            ? getCurrentGrade(result.student.graduatingClassYear, activeEvent.date)
            : 'N/A';

        // Find the rank of this position in the student's favorites
        const favoriteRecord = result.student.positionsSignedUpFor?.find(p => p.positionId === result.positionId);
        const rank = favoriteRecord ? (favoriteRecord.rank + 1).toString() : 'Manual';

        return {
            firstName: result.student.firstName,
            lastName: result.student.lastName,
            grade: grade,
            choice: rank,
            company: result.position.host.company?.companyName || 'Unknown',
            position: result.position.title,
            contactName: result.position.contact_name,
            contactEmail: result.position.contact_email,
            address: result.position.address
        };
    });

    // Sort by company then last name
    csvData.sort((a, b) => 
        a.company.localeCompare(b.company) || 
        a.lastName.localeCompare(b.lastName)
    );

    // Generate CSV
    const headers = ['First Name', 'Last Name', 'Grade', 'Choice', 'Company', 'Position', 'Contact Name', 'Contact Email', 'Address'];
    const csvRows = [
        headers.join(','),
        ...csvData.map(row => [
            `"${row.firstName}"`,
            `"${row.lastName}"`,
            row.grade,
            `"${row.choice}"`,
            `"${row.company}"`,
            `"${row.position}"`,
            `"${row.contactName}"`,
            `"${row.contactEmail}"`,
            `"${row.address.replace(/"/g, '""')}"`
        ].join(','))
    ];

    const csvContent = csvRows.join('\n');

    return new Response(csvContent, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="lottery-results-${activeEvent.id}-${new Date().toISOString().split('T')[0]}.csv"`
        }
    });
}

