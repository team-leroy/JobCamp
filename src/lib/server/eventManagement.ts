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
      lotteryPublished: eventData.lotteryPublished ?? false
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

  const permissionSlipsCompleted = students.filter(s => s.permissionSlipCompleted).length;

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
