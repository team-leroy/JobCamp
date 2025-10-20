import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { createEvent, activateEvent, getSchoolEvents, deleteEvent, archiveEvent } from '$lib/server/eventManagement';

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

    // Calculate filtered stats for each event (same logic as dashboard)
    const eventsWithFilteredStats = await Promise.all(
        schoolEvents.map(async (event) => {
            if (!event.isActive) {
                // For inactive events, show 0 positions/slots
                return {
                    ...event,
                    filteredStats: {
                        totalPositions: 0,
                        totalSlots: 0,
                        studentsWithChoices: 0
                    }
                };
            }

            // For active events, apply same filtering as dashboard
            
            const [filteredPositions, filteredSlots] = await Promise.all([
                // Positions for this event (only published positions)
                prisma.position.count({
                    where: {
                        eventId: event.id,
                        isPublished: true
                    }
                }),
                
                // Slots for this event (only published positions)
                prisma.position.aggregate({
                    where: {
                        eventId: event.id,
                        isPublished: true
                    },
                    _sum: { slots: true }
                }).then(res => res._sum.slots || 0)
            ]);

            return {
                ...event,
                filteredStats: {
                    totalPositions: filteredPositions,
                    totalSlots: filteredSlots,
                    studentsWithChoices: event.stats?.studentsWithChoices || 0
                }
            };
        })
    );

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

    // Load important dates for the active event
    const importantDates = upcomingEvent
        ? await prisma.importantDate.findMany({
            where: { eventId: upcomingEvent.id },
            orderBy: [
                { displayOrder: 'asc' },
                { date: 'asc' }
            ]
        })
        : [];

    return {
        isAdmin: true,
        loggedIn: true,
        isHost: !!locals.user.host,
        schools,
        schoolEvents: eventsWithFilteredStats,
        upcomingEvent,
        importantDates
    };
};

export const actions: Actions = {
    updateEventControls: async ({ request, locals }) => {
        try {
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
                'companyAccounts': 'companyAccountsEnabled',
                'companySignups': 'companySignupsEnabled',
                'studentAccounts': 'studentAccountsEnabled',
                'studentSignups': 'studentSignupsEnabled',
                'lotteryPublished': 'lotteryPublished',
                'companyDirectory': 'companyDirectoryEnabled'
            };

            const field = fieldMap[controlType];
            if (!field) {
                return { success: false, message: 'Invalid control type' };
            }

            // Handle mutual exclusivity between studentSignupsEnabled and lotteryPublished
            const updateData: Record<string, boolean> = { [field]: enabled };
            
            if (field === 'studentSignupsEnabled' && enabled) {
                // If enabling student signups, disable lottery published
                updateData.lotteryPublished = false;
            } else if (field === 'lotteryPublished' && enabled) {
                // If enabling lottery published, disable student signups
                updateData.studentSignupsEnabled = false;
            }

            // Update the event control
            await prisma.event.update({
                where: { id: activeEvent.id },
                data: updateData
            });


            return { 
                success: true, 
                message: `${controlType} ${enabled ? 'enabled' : 'disabled'} successfully`,
                controlType,
                enabled
            };
        } catch (error) {
            console.error('Error in updateEventControls:', error);
            return { 
                success: false, 
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
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
            // Parse the date as UTC to avoid timezone issues
            const [year, month, day] = eventDate.split('-').map(Number);
            const utcDate = new Date(Date.UTC(year, month - 1, day)); // month is 0-indexed, use UTC
            
            const eventData = {
                name: eventName.trim(),
                date: utcDate,
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
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { 
                success: false, 
                message: `Failed to create event: ${errorMessage}` 
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
    },

    deleteEvent: async ({ request, locals }) => {
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

            const result = await deleteEvent(eventId, schoolId);
            return result;
        } catch (error) {
            console.error('Error deleting event:', error);
            return { 
                success: false, 
                message: `Failed to delete event: ${error instanceof Error ? error.message : 'Unknown error'}` 
            };
        }
    },

    archiveEvent: async ({ request, locals }) => {
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

            const formData = await request.formData();
            const eventId = formData.get('eventId')?.toString();

            if (!eventId) {
                return { success: false, message: "Event ID is required" };
            }

            // Archive the event
            await archiveEvent(eventId);

            return { 
                success: true, 
                message: "Event archived successfully" 
            };
        } catch (error) {
            console.error('Error archiving event:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { 
                success: false, 
                message: `Failed to archive event: ${errorMessage}` 
            };
        }
    },

    createImportantDate: async ({ request, locals }) => {
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
            const date = formData.get('date')?.toString();
            const time = formData.get('time')?.toString() || null;
            const title = formData.get('title')?.toString();
            const description = formData.get('description')?.toString();
            const displayOrder = parseInt(formData.get('displayOrder')?.toString() || '0');

            // Validate required fields
            if (!date || !title || !description) {
                return { success: false, message: "Date, title, and description are required" };
            }

            // Parse the date as UTC
            const [year, month, day] = date.split('-').map(Number);
            const utcDate = new Date(Date.UTC(year, month - 1, day));

            // Create the important date
            await prisma.importantDate.create({
                data: {
                    eventId: activeEvent.id,
                    date: utcDate,
                    time: time || null,
                    title: title.trim(),
                    description: description.trim(),
                    displayOrder
                }
            });

            return { success: true, message: "Important date created successfully" };
        } catch (error) {
            console.error('Error creating important date:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    },

    updateImportantDate: async ({ request, locals }) => {
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

            const formData = await request.formData();
            const dateId = formData.get('dateId')?.toString();
            const date = formData.get('date')?.toString();
            const time = formData.get('time')?.toString() || null;
            const title = formData.get('title')?.toString();
            const description = formData.get('description')?.toString();
            const displayOrder = parseInt(formData.get('displayOrder')?.toString() || '0');

            // Validate required fields
            if (!dateId || !date || !title || !description) {
                return { success: false, message: "All required fields must be provided" };
            }

            // Parse the date as UTC
            const [year, month, day] = date.split('-').map(Number);
            const utcDate = new Date(Date.UTC(year, month - 1, day));

            // Update the important date
            await prisma.importantDate.update({
                where: { id: dateId },
                data: {
                    date: utcDate,
                    time: time || null,
                    title: title.trim(),
                    description: description.trim(),
                    displayOrder
                }
            });

            return { success: true, message: "Important date updated successfully" };
        } catch (error) {
            console.error('Error updating important date:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    },

    deleteImportantDate: async ({ request, locals }) => {
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

            const formData = await request.formData();
            const dateId = formData.get('dateId')?.toString();

            if (!dateId) {
                return { success: false, message: "Date ID is required" };
            }

            // Delete the important date
            await prisma.importantDate.delete({
                where: { id: dateId }
            });

            return { success: true, message: "Important date deleted successfully" };
        } catch (error) {
            console.error('Error deleting important date:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
};
