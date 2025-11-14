import { prisma } from './prisma';

/**
 * Check if a student needs to verify their contact info for the active event
 * Returns true if verification is needed, false otherwise
 */
export async function needsContactInfoVerification(
    studentId: string,
    schoolId: string | null
): Promise<boolean> {
    if (!schoolId) {
        return false; // Can't verify without a school
    }

    // Get the active event for the school
    const activeEvent = await prisma.event.findFirst({
        where: {
            schoolId,
            isActive: true
        }
    });

    if (!activeEvent) {
        return false; // No active event means no verification needed
    }

    // Check if participation record exists and if contact info is verified
    const participation = await prisma.studentEventParticipation.findUnique({
        where: {
            studentId_eventId: {
                studentId,
                eventId: activeEvent.id
            }
        }
    });

    // Verification needed if no participation record exists OR contactInfoVerifiedAt is null
    return !participation || !participation.contactInfoVerifiedAt;
}

