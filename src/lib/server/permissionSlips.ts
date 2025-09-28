import { prisma } from './prisma.js';

/**
 * Check if a student has a completed permission slip for a specific event
 */
export async function hasPermissionSlipForEvent(studentId: string, eventId: string): Promise<boolean> {
  const permissionSlip = await prisma.permissionSlipSubmission.findUnique({
    where: {
      studentId_eventId: {
        studentId,
        eventId
      }
    }
  });

  return !!permissionSlip;
}

/**
 * Check if a student has a completed permission slip for the active event
 */
export async function hasPermissionSlipForActiveEvent(studentId: string, schoolId: string): Promise<boolean> {
  // Get the active event for the school
  const activeEvent = await prisma.event.findFirst({
    where: {
      schoolId,
      isActive: true
    }
  });

  if (!activeEvent) {
    return false; // No active event means no permission slip needed/possible
  }

  return hasPermissionSlipForEvent(studentId, activeEvent.id);
}

/**
 * Get permission slip status for a student in the active event
 */
export async function getPermissionSlipStatus(studentId: string, schoolId: string) {
  const activeEvent = await prisma.event.findFirst({
    where: {
      schoolId,
      isActive: true
    }
  });

  if (!activeEvent) {
    return {
      hasActiveEvent: false,
      hasPermissionSlip: false,
      eventId: null,
      eventName: null
    };
  }

  const hasPermissionSlip = await hasPermissionSlipForEvent(studentId, activeEvent.id);

  return {
    hasActiveEvent: true,
    hasPermissionSlip,
    eventId: activeEvent.id,
    eventName: activeEvent.name
  };
}

/**
 * Create a permission slip submission for a specific event
 */
export async function createPermissionSlipForEvent(
  studentId: string,
  eventId: string,
  submissionData: {
    parentName: string;
    phoneNumber: string;
    studentFirstName: string;
    studentLastName: string;
    physicalRestrictions?: string;
    dietaryRestrictions?: string;
    liability: string;
    liabilityDate: string;
  }
) {
  return await prisma.permissionSlipSubmission.create({
    data: {
      studentId,
      eventId,
      parentName: submissionData.parentName,
      phoenNumber: submissionData.phoneNumber,
      studentFirstName: submissionData.studentFirstName,
      studentLastName: submissionData.studentLastName,
      physicalRestrictions: submissionData.physicalRestrictions,
      dietaryRestrictions: submissionData.dietaryRestrictions,
      liability: submissionData.liability,
      liabilityDate: submissionData.liabilityDate,
    }
  });
}
