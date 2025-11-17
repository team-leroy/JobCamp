/**
 * Student Event Participation Tracking
 * 
 * This module handles tracking when students participate in events by making position choices.
 * It ensures that StudentEventParticipation records are created when students make their first choice.
 */

import { prisma } from './prisma';

/**
 * Track student participation in an event
 * This should be called whenever a student makes position choices for an event
 */
export async function trackStudentParticipation(
    studentId: string, 
    eventId: string, 
    participatedAt?: Date
): Promise<void> {
    try {
        // Check if participation already exists
        const existingParticipation = await prisma.studentEventParticipation.findUnique({
            where: {
                studentId_eventId: {
                    studentId,
                    eventId
                }
            }
        });

        // If participation doesn't exist, create it
        if (!existingParticipation) {
            await prisma.studentEventParticipation.create({
                data: {
                    studentId,
                    eventId,
                    participatedAt: participatedAt || new Date(),
                    createdAt: participatedAt || new Date()
                }
            });
        }
    } catch (error) {
        console.error('Error tracking student participation:', error);
        // Don't throw - this is tracking data, shouldn't break the main flow
    }
}

/**
 * Get the event ID for a position
 */
export async function getEventIdForPosition(positionId: string): Promise<string | null> {
    try {
        const position = await prisma.position.findUnique({
            where: { id: positionId },
            select: { eventId: true }
        });
        return position?.eventId || null;
    } catch (error) {
        console.error('Error getting event ID for position:', error);
        return null;
    }
}

/**
 * Get the active event ID for a school
 */
export async function getActiveEventIdForSchool(schoolId: string): Promise<string | null> {
    try {
        const event = await prisma.event.findFirst({
            where: {
                schoolId,
                isActive: true
            },
            select: { id: true }
        });
        return event?.id || null;
    } catch (error) {
        console.error('Error getting active event ID for school:', error);
        return null;
    }
}
