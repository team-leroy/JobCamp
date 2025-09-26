import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { createEvent, activateEvent, getSchoolEvents } from '$lib/server/eventManagement';

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

    // Get school information
    const schools = await prisma.school.findMany({
        where: { id: { in: schoolIds } },
        select: { id: true, name: true }
    });

    // Get all events for event management
    const allEvents = await Promise.all(
        schoolIds.map(schoolId => getSchoolEvents(schoolId, false))
    );
    const schoolEvents = allEvents.flat();

    // Get active event with current event controls
    const upcomingEvent = await prisma.event.findFirst({
        where: {
            schoolId: { in: schoolIds },
            isActive: true
        },
        orderBy: {
            date: 'asc'
        }
    });

    return {
        isAdmin: true,
        loggedIn: true,
        isHost: !!locals.user.host,
        schools,
        schoolEvents,
        upcomingEvent
    };
};

export const actions: Actions = {
    updateEventControls: async ({ request, locals }) => {
        if (!locals.user) {
            return { success: false, message: 'Not authenticated' };
        }

        // Check if user is admin
        const userInfo = await prisma.user.findFirst({
            where: { id: locals.user.id },
            include: { adminOfSchools: true }
        });

        if (!userInfo?.adminOfSchools?.length) {
            return { success: false, message: 'Not authorized' };
        }

        const schoolIds = userInfo.adminOfSchools.map(s => s.id);
        const formData = await request.formData();
        const controlType = formData.get('controlType') as string;
        const enabled = formData.get('enabled') === 'true';

        // Get the active event for this school
        const activeEvent = await prisma.event.findFirst({
            where: {
                schoolId: { in: schoolIds },
                isActive: true
            }
        });

        if (!activeEvent) {
            return { success: false, message: 'No active event found' };
        }

        // Map control types to database fields
        const fieldMap: Record<string, string> = {
            'event': 'eventEnabled',
            'companyAccounts': 'companyAccountsEnabled',
            'studentAccounts': 'studentAccountsEnabled',
            'studentSignups': 'studentSignupsEnabled',
            'lotteryPublished': 'lotteryPublished',
            'companyDirectory': 'companyDirectoryEnabled'
        };

        const field = fieldMap[controlType];
        if (!field) {
            return { success: false, message: 'Invalid control type' };
        }

        // Update the event control
        await prisma.event.update({
            where: { id: activeEvent.id },
            data: { [field]: enabled }
        });

        return { 
            success: true, 
            message: `${controlType} ${enabled ? 'enabled' : 'disabled'} successfully`,
            controlType,
            enabled
        };
    },

    createEvent: async ({ request, locals }) => {
        if (!locals.user) {
            return { 
                success: false, 
                message: "User not authenticated" 
            };
        }

        try {
            // Get user's school
            const userInfo = await prisma.user.findFirst({
                where: { id: locals.user.id },
                include: { adminOfSchools: true }
            });
            
            if (!userInfo?.adminOfSchools?.length) {
                return { success: false, message: "Not authorized" };
            }

            const schoolId = userInfo.adminOfSchools[0].id;

            // Parse form data
            const formData = await request.formData();
            const eventName = formData.get('eventName')?.toString();
            const eventDate = formData.get('eventDate')?.toString();
            const carryForwardData = formData.get('carryForwardData') === 'on';

            // Validate required fields
            if (!eventName || !eventName.trim()) {
                return { success: false, message: "Event name is required" };
            }

            if (!eventDate) {
                return { success: false, message: "Event date is required" };
            }

            // Create the event (displayLotteryResults removed, defaulting to false)
            const eventData = {
                name: eventName.trim(),
                date: new Date(eventDate),
                displayLotteryResults: false, // Always false - controlled by Event Controls
                carryForwardData
            };

            await createEvent(schoolId, eventData);

            return { 
                success: true, 
                message: `Event "${eventName}" created successfully as inactive. Use the "Activate" button to make it your active event.` 
            };
        } catch (error) {
            console.error('Error creating event:', error);
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
            return { 
                success: false, 
                message: `Failed to create event: ${error.message}` 
            };
        }
    },

    activateEvent: async ({ request, locals }) => {
        if (!locals.user) {
            return { success: false, message: "Not authenticated" };
        }

        try {
            // Get user's school
            const userInfo = await prisma.user.findFirst({
                where: { id: locals.user.id },
                include: { adminOfSchools: true }
            });

            if (!userInfo?.adminOfSchools?.length) {
                return { success: false, message: "Not authorized" };
            }

            const schoolId = userInfo.adminOfSchools[0].id;
            
            // Parse form data
            const formData = await request.formData();
            const eventId = formData.get('eventId')?.toString();

            if (!eventId) {
                return { success: false, message: "Event ID is required" };
            }

            // Verify the event belongs to the school
            const event = await prisma.event.findFirst({
                where: { 
                    id: eventId,
                    schoolId 
                }
            });

            if (!event) {
                return { success: false, message: "Event not found or not authorized" };
            }

            await activateEvent(eventId, schoolId);

            return { 
                success: true, 
                message: `Event "${event.name || 'Unnamed Event'}" is now active. Use Event Controls to enable student/company access.` 
            };
        } catch (error) {
            console.error('Error activating event:', error);
            return { 
                success: false, 
                message: "Failed to activate event" 
            };
        }
    }
};
