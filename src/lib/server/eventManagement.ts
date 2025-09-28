import { prisma } from './prisma.js';

export interface EventData {
  name?: string;
  date: Date;
  displayLotteryResults?: boolean;
  carryForwardData?: boolean; // Default to true - carry forward existing data
  // Event Controls
  eventEnabled?: boolean;
  companyAccountsEnabled?: boolean;
  studentAccountsEnabled?: boolean;
  studentSignupsEnabled?: boolean;
  lotteryPublished?: boolean;
  companyDirectoryEnabled?: boolean;
}

export interface EventWithStats {
  id: string;
  name: string | null;
  date: Date;
  isActive: boolean;
  isArchived: boolean;
  displayLotteryResults: boolean;
  schoolId: string;
  // Event Controls
  eventEnabled: boolean;
  companyAccountsEnabled: boolean;
  studentAccountsEnabled: boolean;
  studentSignupsEnabled: boolean;
  lotteryPublished: boolean;
  companyDirectoryEnabled: boolean;
  stats?: {
    totalPositions: number;
    totalSlots: number;
    studentsWithChoices: number;
  };
}

/**
 * Get all events for a school, optionally including archived events
 */
export async function getSchoolEvents(
  schoolId: string, 
  includeArchived = false
): Promise<EventWithStats[]> {
  const events = await prisma.event.findMany({
    where: {
      schoolId,
      ...(includeArchived ? {} : { isArchived: false })
    },
    orderBy: { date: 'desc' },
    include: {
      positions: {
        select: {
          id: true,
          slots: true,
          students: {
            select: { studentId: true }
          }
        }
      }
    }
  });

  return events.map(event => ({
    id: event.id,
    name: event.name,
    date: event.date,
    isActive: event.isActive,
    isArchived: event.isArchived,
    displayLotteryResults: event.displayLotteryResults,
    schoolId: event.schoolId,
    // Event Controls
    eventEnabled: event.eventEnabled,
    companyAccountsEnabled: event.companyAccountsEnabled,
    studentAccountsEnabled: event.studentAccountsEnabled,
    studentSignupsEnabled: event.studentSignupsEnabled,
    lotteryPublished: event.lotteryPublished,
    companyDirectoryEnabled: event.companyDirectoryEnabled,
    stats: {
      totalPositions: event.positions.length,
      totalSlots: event.positions.reduce((sum, pos) => sum + pos.slots, 0),
      studentsWithChoices: new Set(
        event.positions.flatMap(pos => 
          pos.students.map(s => s.studentId)
        )
      ).size
    }
  }));
}

/**
 * Get the active event for a school
 */
export async function getActiveEvent(schoolId: string): Promise<EventWithStats | null> {
  const event = await prisma.event.findFirst({
    where: {
      schoolId,
      isActive: true
    },
    include: {
      positions: {
        select: {
          id: true,
          slots: true,
          students: {
            select: { studentId: true }
          }
        }
      }
    }
  });

  if (!event) return null;

  return {
    id: event.id,
    name: event.name,
    date: event.date,
    isActive: event.isActive,
    isArchived: event.isArchived,
    displayLotteryResults: event.displayLotteryResults,
    schoolId: event.schoolId,
    // Event Controls
    eventEnabled: event.eventEnabled,
    companyAccountsEnabled: event.companyAccountsEnabled,
    studentAccountsEnabled: event.studentAccountsEnabled,
    studentSignupsEnabled: event.studentSignupsEnabled,
    lotteryPublished: event.lotteryPublished,
    companyDirectoryEnabled: event.companyDirectoryEnabled,
    stats: {
      totalPositions: event.positions.length,
      totalSlots: event.positions.reduce((sum, pos) => sum + pos.slots, 0),
      studentsWithChoices: new Set(
        event.positions.flatMap(pos => 
          pos.students.map(s => s.studentId)
        )
      ).size
    }
  };
}

/**
 * Create a new event for a school
 */
export async function createEvent(
  schoolId: string, 
  eventData: EventData
): Promise<EventWithStats> {
  const shouldCarryForward = eventData.carryForwardData ?? true; // Default to true
  
  // Create the new event
  const event = await prisma.event.create({
    data: {
      schoolId,
      name: eventData.name,
      date: eventData.date,
      displayLotteryResults: eventData.displayLotteryResults ?? false,
      isActive: false,
      isArchived: false,
      // Event Controls - new events start in draft mode (all disabled)
      eventEnabled: eventData.eventEnabled ?? false,
      companyAccountsEnabled: eventData.companyAccountsEnabled ?? false,
      studentAccountsEnabled: eventData.studentAccountsEnabled ?? false,
      studentSignupsEnabled: eventData.studentSignupsEnabled ?? false,
      lotteryPublished: eventData.lotteryPublished ?? false,
      // companyDirectoryEnabled: eventData.companyDirectoryEnabled ?? false // TEMP: Removed to fix Prisma issue
    }
  });

  // If carryForwardData is true, copy positions from the most recent event
  if (shouldCarryForward) {
    // Find the most recent event for this school (active or archived)
    const previousEvent = await prisma.event.findFirst({
      where: {
        schoolId,
        id: { not: event.id } // Exclude the event we just created
      },
      orderBy: { date: 'desc' },
      include: {
        positions: {
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

    if (previousEvent && previousEvent.positions.length > 0) {
      // Copy positions from the previous event
      const positionData = previousEvent.positions.map(position => ({
        title: position.title,
        career: position.career,
        slots: position.slots,
        summary: position.summary,
        contact_name: position.contact_name,
        contact_email: position.contact_email,
        address: position.address,
        instructions: position.instructions,
        attire: position.attire,
        arrival: position.arrival,
        start: position.start,
        end: position.end,
        eventId: event.id,
        hostId: position.hostId
      }));

      await prisma.position.createMany({
        data: positionData
      });
    }
  }

  // Get the final event with stats
  const eventWithStats = await prisma.event.findUnique({
    where: { id: event.id },
    include: {
      positions: {
        select: {
          id: true,
          slots: true,
          students: {
            select: { studentId: true }
          }
        }
      }
    }
  });

  return {
    id: eventWithStats!.id,
    name: eventWithStats!.name,
    date: eventWithStats!.date,
    isActive: eventWithStats!.isActive,
    isArchived: eventWithStats!.isArchived,
    displayLotteryResults: eventWithStats!.displayLotteryResults,
    schoolId: eventWithStats!.schoolId,
    // Event Controls
    eventEnabled: eventWithStats!.eventEnabled,
    companyAccountsEnabled: eventWithStats!.companyAccountsEnabled,
    studentAccountsEnabled: eventWithStats!.studentAccountsEnabled,
    studentSignupsEnabled: eventWithStats!.studentSignupsEnabled,
    lotteryPublished: eventWithStats!.lotteryPublished,
    companyDirectoryEnabled: eventWithStats!.companyDirectoryEnabled ?? false, // TEMP: Handle missing field
    stats: {
      totalPositions: eventWithStats!.positions.length,
      totalSlots: eventWithStats!.positions.reduce((sum, pos) => sum + pos.slots, 0),
      studentsWithChoices: new Set(
        eventWithStats!.positions.flatMap(pos => 
          pos.students.map(s => s.studentId)
        )
      ).size
    }
  };
}

/**
 * Activate an event (deactivates any currently active event for the school)
 */
export async function activateEvent(eventId: string, schoolId: string): Promise<EventWithStats> {
  // First, deactivate any currently active event for this school
  await prisma.event.updateMany({
    where: {
      schoolId,
      isActive: true
    },
    data: {
      isActive: false
    }
  });

  // Then activate the specified event
  const event = await prisma.event.update({
    where: { id: eventId },
    data: { isActive: true },
    include: {
      positions: {
        select: {
          id: true,
          slots: true,
          students: {
            select: { studentId: true }
          }
        }
      }
    }
  });

  return {
    id: event.id,
    name: event.name,
    date: event.date,
    isActive: event.isActive,
    isArchived: event.isArchived,
    displayLotteryResults: event.displayLotteryResults,
    schoolId: event.schoolId,
    stats: {
      totalPositions: event.positions.length,
      totalSlots: event.positions.reduce((sum, pos) => sum + pos.slots, 0),
      studentsWithChoices: new Set(
        event.positions.flatMap(pos => 
          pos.students.map(s => s.studentId)
        )
      ).size
    }
  };
}

/**
 * Archive an event (sets isArchived = true, isActive = false)
 */
export async function archiveEvent(eventId: string): Promise<EventWithStats> {
  const event = await prisma.event.update({
    where: { id: eventId },
    data: {
      isActive: false,
      isArchived: true
    },
    include: {
      positions: {
        select: {
          id: true,
          slots: true,
          students: {
            select: { studentId: true }
          }
        }
      }
    }
  });

  return {
    id: event.id,
    name: event.name,
    date: event.date,
    isActive: event.isActive,
    isArchived: event.isArchived,
    displayLotteryResults: event.displayLotteryResults,
    schoolId: event.schoolId,
    stats: {
      totalPositions: event.positions.length,
      totalSlots: event.positions.reduce((sum, pos) => sum + pos.slots, 0),
      studentsWithChoices: new Set(
        event.positions.flatMap(pos => 
          pos.students.map(s => s.studentId)
        )
      ).size
    }
  };
}

/**
 * Update an event
 */
export async function updateEvent(
  eventId: string, 
  eventData: Partial<EventData>
): Promise<EventWithStats> {
  const event = await prisma.event.update({
    where: { id: eventId },
    data: {
      ...(eventData.name !== undefined && { name: eventData.name }),
      ...(eventData.date !== undefined && { date: eventData.date }),
      ...(eventData.displayLotteryResults !== undefined && { 
        displayLotteryResults: eventData.displayLotteryResults 
      })
    },
    include: {
      positions: {
        select: {
          id: true,
          slots: true,
          students: {
            select: { studentId: true }
          }
        }
      }
    }
  });

  return {
    id: event.id,
    name: event.name,
    date: event.date,
    isActive: event.isActive,
    isArchived: event.isArchived,
    displayLotteryResults: event.displayLotteryResults,
    schoolId: event.schoolId,
    stats: {
      totalPositions: event.positions.length,
      totalSlots: event.positions.reduce((sum, pos) => sum + pos.slots, 0),
      studentsWithChoices: new Set(
        event.positions.flatMap(pos => 
          pos.students.map(s => s.studentId)
        )
      ).size
    }
  };
}

/**
 * Delete an event (only allowed for inactive, non-archived events with no student assignments)
 */
export async function deleteEvent(eventId: string, schoolId: string): Promise<{ success: boolean; message: string }> {
  // Check if event exists and belongs to the school
  const event = await prisma.event.findFirst({
    where: { 
      id: eventId,
      schoolId 
    },
    include: {
      positions: {
        include: {
          students: true
        }
      }
    }
  });

  if (!event) {
    return { success: false, message: "Event not found or not authorized" };
  }

  // Validate deletion rules
  if (event.isActive) {
    return { success: false, message: "Cannot delete the active event. Deactivate it first by activating another event." };
  }

  if (event.isArchived) {
    return { success: false, message: "Cannot delete archived events. Archived events preserve historical data." };
  }

  // Check for any student interactions with this event
  const hasStudentSignups = event.positions.some(position => position.students.length > 0);
  if (hasStudentSignups) {
    return { success: false, message: "Cannot delete event with student signups. Archive it instead to preserve data." };
  }

  // Check if any manual assignments exist for positions in this event
  const hasManualAssignments = await prisma.manualAssignment.findFirst({
    where: {
      position: {
        eventId: eventId
      }
    }
  });

  if (hasManualAssignments) {
    return { success: false, message: "Cannot delete event with manual position assignments. Archive it instead to preserve data." };
  }

  // Check if any lottery jobs exist for this event
  const hasLotteryJobs = await prisma.lotteryJob.findFirst({
    where: {
      eventId: eventId
    }
  });

  if (hasLotteryJobs) {
    return { success: false, message: "Cannot delete event with lottery history. Archive it instead to preserve historical data." };
  }

  // Delete positions first (cascade should handle this, but being explicit)
  await prisma.position.deleteMany({
    where: { eventId }
  });

  // Delete the event
  await prisma.event.delete({
    where: { id: eventId }
  });

  return { success: true, message: `Event "${event.name || 'Unnamed Event'}" deleted successfully.` };
}

/**
 * Get archived event statistics for dashboard viewing
 */
export async function getArchivedEventStats(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      positions: {
        include: {
          host: {
            include: {
              company: true
            }
          },
          students: {
            include: {
              student: true
            }
          }
        }
      }
    }
  });

  if (!event) {
    throw new Error('Event not found');
  }

  // Calculate student statistics
  const allStudentIds = new Set(
    event.positions.flatMap(pos => 
      pos.students.map(s => s.studentId)
    )
  );

  const students = await prisma.student.findMany({
    where: {
      id: { in: Array.from(allStudentIds) }
    }
  });

  const gradeDistribution = students.reduce((acc, student) => {
    acc[student.grade] = (acc[student.grade] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  // Count permission slips for this specific event
  const permissionSlipsCompleted = await prisma.permissionSlipSubmission.count({
    where: {
      eventId: eventId,
      studentId: { in: Array.from(allStudentIds) }
    }
  });

  // Calculate company statistics
  const companies = new Set(
    event.positions.map(pos => pos.host?.company?.id).filter(Boolean)
  );

  return {
    event: {
      id: event.id,
      name: event.name,
      date: event.date,
      isActive: event.isActive,
      isArchived: event.isArchived
    },
    studentStats: {
      totalStudents: students.length,
      studentsWithChoices: allStudentIds.size,
      gradeDistribution,
      permissionSlipsCompleted
    },
    companyStats: {
      totalCompanies: companies.size,
      totalPositions: event.positions.length,
      totalSlots: event.positions.reduce((sum, pos) => sum + pos.slots, 0)
    }
  };
}
