import { prisma } from '$lib/server/prisma';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getNavbarData } from '$lib/server/navbarData';

export const load: PageServerLoad = async ({ params, locals }) => {
    const loggedIn = locals.user != null;
    
    let isHost = false;
    let isAdmin = false;
    if (locals.user) {
        isHost = locals.user.host != null;
        isAdmin = locals.user.adminOfSchools != null && locals.user.adminOfSchools.length > 0;
    }

    const schoolWebAddr = params.school;

    const school = await prisma.school.findFirst({ where: { webAddr: schoolWebAddr } });

    if (!school) {
        redirect(302, "/");
    }

    // Check if there's an active event and if company directory is enabled
    const activeEvent = await prisma.event.findFirst({
        where: {
            schoolId: school.id,
            isActive: true
        }
    });

    const companyDirectoryEnabled = activeEvent?.companyDirectoryEnabled ?? false;
    const directoryAccessible = Boolean(activeEvent?.isActive) && companyDirectoryEnabled;

    let positionData = [];
    let archivedEventCompanies: string[] = [];
    
    if (directoryAccessible) {
        const positions = await prisma.position.findMany({
            where: {
                event: {
                    schoolId: school.id,
                    isActive: true
                },
                isPublished: true, // Only show published positions in company directory
                host: {
                    user: {
                        OR: [
                            { role: null },
                            { role: { not: 'INTERNAL_TESTER' } }
                        ]
                    }
                }
            },
            include: {
                host: {
                    select: {
                        company: true
                    }
                }
            }
        });
        // Sort by company name (alphabetically), then by position title within same company
        positionData = positions.sort((a, b) => {
            const nameA = a.host?.company?.companyName ?? '';
            const nameB = b.host?.company?.companyName ?? '';
            const cmp = nameA.localeCompare(nameB);
            return cmp !== 0 ? cmp : (a.title ?? '').localeCompare(b.title ?? '');
        });
    } else {
        // Get the last archived event for this school
        const lastArchivedEvent = await prisma.event.findFirst({
            where: {
                schoolId: school.id,
                isArchived: true
            },
            orderBy: {
                date: 'desc'
            },
            include: {
                positions: {
                    where: {
                        host: {
                            user: {
                                OR: [
                                    { role: null },
                                    { role: { not: 'INTERNAL_TESTER' } }
                                ]
                            }
                        }
                    },
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

        // Extract unique company names from the archived event
        if (lastArchivedEvent) {
            const companyNamesSet = new Set<string>();
            lastArchivedEvent.positions.forEach(position => {
                if (position.host?.company?.companyName) {
                    companyNamesSet.add(position.host.company.companyName);
                }
            });
            archivedEventCompanies = Array.from(companyNamesSet).sort();
        }
    }

    // Get navbar data
    const navbarData = await getNavbarData();

    return { 
        positionData, 
        isHost, 
        loggedIn, 
        isAdmin,
        hasActiveEvent: !!activeEvent,
        companyDirectoryEnabled,
        directoryAccessible,
        eventName: activeEvent?.name || null,
        archivedEventCompanies,
        ...navbarData
    };
}