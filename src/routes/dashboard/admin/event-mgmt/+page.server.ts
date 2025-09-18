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

    return {
        isAdmin: true,
        loggedIn: true,
        isHost: !!locals.user.host,
        schools,
        schoolEvents
    };
};

export const actions: Actions = {
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
                message: `Event "${eventName}" created successfully in draft state. Use the "Activate" button to make it active.` 
            };
        } catch (error) {
            console.error('Error creating event:', error);
            return { 
                success: false, 
                message: "Failed to create event" 
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
