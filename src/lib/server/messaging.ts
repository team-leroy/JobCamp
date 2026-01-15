/**
 * Messaging Service
 * Handles recipient filtering and message composition for the messaging system
 */

import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export interface StudentRecipient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  parentEmail: string;
}

export interface CompanyRecipient {
  id: string;
  companyName: string;
  accountHolderEmail: string;
  accountHolderName: string;
  hostContacts: Array<{
    positionId: string;
    positionTitle: string;
    contactName: string;
    contactEmail: string;
  }>;
}

export interface RecipientPreview {
  count: number;
  recipients: Array<{
    name: string;
    email?: string;
    phone?: string;
  }>;
}

/**
 * Get all students with accounts for the active event
 */
export async function getAllStudents(schoolId: string): Promise<StudentRecipient[]> {
  const activeEvent = await prisma.event.findFirst({
    where: {
      schoolId,
      isActive: true
    }
  });

  if (!activeEvent) {
    return [];
  }

  const students = await prisma.student.findMany({
    where: {
      schoolId,
      isActive: true
    },
    include: {
      user: {
        select: {
          email: true
        }
      }
    }
  });

  // Filter out students without user accounts to prevent crashes
  const studentsWithAccounts = students.filter(s => s.user !== null);

  return studentsWithAccounts.map(s => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.user!.email,
    phone: s.phone,
    parentEmail: s.parentEmail
  }));
}

/**
 * Get students with incomplete permission slips
 */
export async function getStudentsWithIncompletePermissionSlip(schoolId: string): Promise<StudentRecipient[]> {
  const activeEvent = await prisma.event.findFirst({
    where: {
      schoolId,
      isActive: true
    }
  });

  if (!activeEvent) {
    return [];
  }

  const students = await prisma.student.findMany({
    where: {
      schoolId,
      isActive: true,
      permissionSlips: {
        none: {
          eventId: activeEvent.id
        }
      }
    },
    include: {
      user: {
        select: {
          email: true
        }
      }
    }
  });

  return students.map(s => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.user!.email,
    phone: s.phone,
    parentEmail: s.parentEmail
  }));
}

/**
 * Get students with complete permission slip but no job picks
 */
export async function getStudentsWithNoJobPicks(schoolId: string): Promise<StudentRecipient[]> {
  const activeEvent = await prisma.event.findFirst({
    where: {
      schoolId,
      isActive: true
    }
  });

  if (!activeEvent) {
    return [];
  }

  const students = await prisma.student.findMany({
    where: {
      schoolId,
      isActive: true,
      positionsSignedUpFor: {
        none: {
          position: {
            eventId: activeEvent.id
          }
        }
      }
    },
    include: {
      user: {
        select: {
          email: true
        }
      }
    }
  });

  // Filter out students without user accounts to prevent crashes
  const studentsWithAccounts = students.filter(s => s.user !== null);

  return studentsWithAccounts.map(s => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.user!.email,
    phone: s.phone,
    parentEmail: s.parentEmail
  }));
}

/**
 * Get students with fewer than specified number of picks
 */
export async function getStudentsWithFewPicks(schoolId: string, maxPicks: number): Promise<StudentRecipient[]> {
  const activeEvent = await prisma.event.findFirst({
    where: {
      schoolId,
      isActive: true
    }
  });

  if (!activeEvent) {
    return [];
  }

  const students = await prisma.student.findMany({
    where: {
      schoolId,
      isActive: true
    },
    include: {
      user: {
        select: {
          email: true
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
            select: {
              slots: true
            }
          }
        }
      }
    }
  });

  // Filter students with fewer than maxPicks
  const filtered = students.filter(s => s.positionsSignedUpFor.length < maxPicks);

  return filtered.map(s => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.user!.email,
    phone: s.phone,
    parentEmail: s.parentEmail
  }));
}

/**
 * Get students with total slots across all picks less than specified number
 */
export async function getStudentsWithFewSlots(schoolId: string, maxSlots: number): Promise<StudentRecipient[]> {
  const activeEvent = await prisma.event.findFirst({
    where: {
      schoolId,
      isActive: true
    }
  });

  if (!activeEvent) {
    return [];
  }

  const students = await prisma.student.findMany({
    where: {
      schoolId,
      isActive: true
    },
    include: {
      user: {
        select: {
          email: true
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
            select: {
              slots: true
            }
          }
        }
      }
    }
  });

  // Filter students where sum of slots < maxSlots
  const filtered = students.filter(s => {
    const totalSlots = s.positionsSignedUpFor.reduce((sum, pick) => sum + pick.position.slots, 0);
    return totalSlots < maxSlots;
  });

  return filtered.map(s => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.user!.email,
    phone: s.phone,
    parentEmail: s.parentEmail
  }));
}

/**
 * Get students assigned to positions after lottery
 */
export async function getStudentsAssignedInLottery(schoolId: string): Promise<StudentRecipient[]> {
  const activeEvent = await prisma.event.findFirst({
    where: {
      schoolId,
      isActive: true
    }
  });

  if (!activeEvent) {
    return [];
  }

  // Get the most recent completed lottery job for this event
  const latestLotteryJob = await prisma.lotteryJob.findFirst({
    where: {
      eventId: activeEvent.id,
      status: 'COMPLETED'
    },
    orderBy: {
      completedAt: 'desc'
    }
  });

  if (!latestLotteryJob) {
    return [];
  }

  // Get students with lottery results
  const assignments = await prisma.lotteryResults.findMany({
    where: {
      lotteryJobId: latestLotteryJob.id,
      student: {
        schoolId,
        isActive: true
      }
    },
    include: {
      student: {
        include: {
          user: {
            select: {
              email: true
            }
          }
        }
      }
    }
  });

  return assignments
    .map(({ student }) => student)
    .filter((student): student is NonNullable<typeof student> => Boolean(student?.user))
    .map((student) => ({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.user!.email,
      phone: student.phone,
      parentEmail: student.parentEmail
    }));
}

/**
 * Get students NOT assigned in lottery (participated but didn't get a position)
 */
export async function getStudentsUnassignedInLottery(schoolId: string): Promise<StudentRecipient[]> {
  const activeEvent = await prisma.event.findFirst({
    where: {
      schoolId,
      isActive: true
    }
  });

  if (!activeEvent) {
    return [];
  }

  // Get the most recent completed lottery job for this event
  const latestLotteryJob = await prisma.lotteryJob.findFirst({
    where: {
      eventId: activeEvent.id,
      status: 'COMPLETED'
    },
    orderBy: {
      completedAt: 'desc'
    }
  });

  if (!latestLotteryJob) {
    return [];
  }

  const assignedStudentIds = await prisma.lotteryResults.findMany({
    where: {
      lotteryJobId: latestLotteryJob.id
    },
    select: {
      studentId: true
    }
  });

  const whereClause: Prisma.StudentWhereInput = {
    schoolId,
    isActive: true,
    positionsSignedUpFor: {
      some: {
        position: {
          eventId: activeEvent.id
        }
      }
    }
  };

  const assignedIds = assignedStudentIds.map((result) => result.studentId);
  if (assignedIds.length > 0) {
    whereClause.id = { notIn: assignedIds };
  }

  // Get students who made picks but have no lottery result
  const students = await prisma.student.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          email: true
        }
      }
    }
  });

  return students.map(s => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.user!.email,
    phone: s.phone,
    parentEmail: s.parentEmail
  }));
}

/**
 * Get company contacts for a specific group in the active event
 */
export async function getCompanyRecipientsByGroup(schoolId: string, group: string): Promise<Array<{
  email: string;
  name: string;
  companyName: string;
  type: 'account_holder' | 'host_contact';
  companyId?: string;
}>> {
  const activeEvent = await prisma.event.findFirst({
    where: {
      schoolId,
      isActive: true
    }
  });

  if (!activeEvent) {
    return [];
  }

  const emailSet = new Set<string>();
  const contacts: Array<{
    email: string;
    name: string;
    companyName: string;
    type: 'account_holder' | 'host_contact';
    companyId?: string;
  }> = [];

  // Helper to add contacts for a company
  const addCompanyContacts = (
    company: { id: string; companyName: string; hosts: Array<{ id: string; name: string; user?: { email: string | null } }> },
    positions: Array<{ contact_name: string; contact_email: string }>
  ) => {
    const companyName = company.companyName;

    // Add account holders
    company.hosts.forEach((host) => {
      if (host.user?.email && !emailSet.has(host.user.email)) {
        emailSet.add(host.user.email);
        contacts.push({
          email: host.user.email,
          name: host.name,
          companyName,
          type: "account_holder",
          companyId: company.id,
        });
      }
    });

    // Add position contacts
    positions.forEach((pos) => {
      if (pos.contact_email && !emailSet.has(pos.contact_email)) {
        emailSet.add(pos.contact_email);
        contacts.push({
          email: pos.contact_email,
          name: pos.contact_name,
          companyName,
          type: "host_contact",
          companyId: company.id,
        });
      }
    });
  };

  switch (group) {
    case 'all_companies': {
      // All companies that have any position (draft or published) in the active event
      const companies = await prisma.company.findMany({
        where: {
          schoolId,
          hosts: {
            some: {
              positions: {
                some: { eventId: activeEvent.id }
              }
            }
          }
        },
        include: {
          hosts: {
            include: {
              user: { select: { email: true } },
              positions: {
                where: { eventId: activeEvent.id }
              }
            }
          }
        }
      });

      companies.forEach(company => {
        const positions = company.hosts.flatMap(h => h.positions);
        addCompanyContacts(company, positions);
      });
      break;
    }

    case 'published_positions': {
      const companies = await prisma.company.findMany({
        where: {
          schoolId,
          hosts: {
            some: {
              positions: {
                some: { 
                  eventId: activeEvent.id,
                  isPublished: true
                }
              }
            }
          }
        },
        include: {
          hosts: {
            include: {
              user: { select: { email: true } },
              positions: {
                where: { 
                  eventId: activeEvent.id,
                  isPublished: true
                }
              }
            }
          }
        }
      });

      companies.forEach(company => {
        const positions = company.hosts.flatMap(h => h.positions);
        addCompanyContacts(company, positions);
      });
      break;
    }

    case 'draft_positions': {
      const companies = await prisma.company.findMany({
        where: {
          schoolId,
          hosts: {
            some: {
              positions: {
                some: { 
                  eventId: activeEvent.id,
                  isPublished: false
                }
              }
            }
          }
        },
        include: {
          hosts: {
            include: {
              user: { select: { email: true } },
              positions: {
                where: { 
                  eventId: activeEvent.id,
                  isPublished: false
                }
              }
            }
          }
        }
      });

      companies.forEach(company => {
        const positions = company.hosts.flatMap(h => h.positions);
        addCompanyContacts(company, positions);
      });
      break;
    }

    case 'no_positions': {
      // Companies that logged in but have no positions for this event
      const companies = await prisma.company.findMany({
        where: {
          schoolId,
          hosts: {
            some: {
              user: {
                lastLogin: { gte: activeEvent.createdAt }
              }
            }
          }
        },
        include: {
          hosts: {
            include: {
              user: { select: { email: true } },
              positions: {
                where: { eventId: activeEvent.id }
              }
            }
          }
        }
      });

      const companiesWithNoPos = companies.filter(c => 
        c.hosts.every(h => h.positions.length === 0)
      );

      companiesWithNoPos.forEach(company => {
        addCompanyContacts(company, []);
      });
      break;
    }

    case 'students_attending': {
      const companies = await prisma.company.findMany({
        where: {
          schoolId,
          hosts: {
            some: {
              positions: {
                some: {
                  eventId: activeEvent.id,
                  lotteryAssignments: { some: {} }
                }
              }
            }
          }
        },
        include: {
          hosts: {
            include: {
              user: { select: { email: true } },
              positions: {
                where: { 
                  eventId: activeEvent.id,
                  lotteryAssignments: { some: {} }
                }
              }
            }
          }
        }
      });

      companies.forEach(company => {
        const positions = company.hosts.flatMap(h => h.positions);
        addCompanyContacts(company, positions);
      });
      break;
    }

    case 'all_company_contacts': {
      // Legacy - all published contacts
      const companies = await prisma.company.findMany({
        where: {
          schoolId,
          hosts: {
            some: {
              positions: {
                some: { 
                  eventId: activeEvent.id,
                  isPublished: true
                }
              }
            }
          }
        },
        include: {
          hosts: {
            include: {
              user: { select: { email: true } },
              positions: {
                where: { 
                  eventId: activeEvent.id,
                  isPublished: true
                }
              }
            }
          }
        }
      });

      companies.forEach(company => {
        const positions = company.hosts.flatMap(h => h.positions);
        addCompanyContacts(company, positions);
      });
      break;
    }
  }

  return contacts;
}

/**
 * Generate a template for a company with its attending students
 */
export async function generateCompanyStudentsAttendingTemplate(companyId: string, eventId: string): Promise<string> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      hosts: {
        include: {
          positions: {
            where: { eventId },
            include: {
              lotteryAssignments: {
                include: {
                  student: {
                    include: {
                      user: { select: { email: true } }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  const activeEvent = await prisma.event.findUnique({
    where: { id: eventId }
  });

  if (!company || !activeEvent) return '';

  const host = company.hosts[0];
  const hostName = host?.name || 'Partner';
  
  const eventDate = new Date(activeEvent.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  let template = `Dear ${hostName},\n\n`;
  template += `    The following students have been selected to attend your JobCamp Session on ${eventDate}:\n\n`;

  company.hosts.forEach(h => {
    h.positions.forEach(pos => {
      if (pos.lotteryAssignments.length > 0) {
        template += `Position: ${pos.title} (${pos.start} - ${pos.end})\n`;
        pos.lotteryAssignments.forEach(assignment => {
          const s = assignment.student;
          const grade = s.graduatingClassYear ? getCurrentGrade(s.graduatingClassYear, activeEvent.date) : 'N/A';
          template += `${s.firstName} ${s.lastName}, Grade ${grade} (${s.user?.email || 'No Email'})\n`;
        });
        template += `\n`;
      }
    });
  });

  return template;
}

/**
 * Get all company account holders (users with host accounts)
 */
export async function getCompanyAccountHolders(schoolId: string): Promise<CompanyRecipient[]> {
  const companies = await prisma.company.findMany({
    where: {
      schoolId
    },
    include: {
      hosts: {
        include: {
          user: {
            select: {
              email: true
            }
          }
        }
      }
    }
  });

  return companies.map(c => ({
    id: c.id,
    companyName: c.companyName,
    accountHolderEmail: c.hosts[0]?.user.email || '',
    accountHolderName: c.hosts[0]?.name || '',
    hostContacts: []
  })).filter(c => c.accountHolderEmail); // Only include companies with account holders
}

/**
 * Get all company account holders AND host contacts (deduplicated)
 */
export async function getAllCompanyContactsForEvent(schoolId: string): Promise<Array<{
  email: string;
  name: string;
  companyName: string;
  type: 'account_holder' | 'host_contact';
}>> {
  return getCompanyRecipientsByGroup(schoolId, 'all_company_contacts');
}

/**
 * Get available slots after lottery (for unassigned students)
 */
export async function getAvailableSlotsAfterLottery(schoolId: string): Promise<Array<{
  positionId: string;
  title: string;
  companyName: string;
  slots: number;
  assigned: number;
  available: number;
}>> {
  const activeEvent = await prisma.event.findFirst({
    where: {
      schoolId,
      isActive: true
    }
  });

  if (!activeEvent) {
    return [];
  }

  const latestLotteryJob = await prisma.lotteryJob.findFirst({
    where: {
      eventId: activeEvent.id,
      status: 'COMPLETED'
    },
    orderBy: {
      completedAt: 'desc'
    }
  });

  if (!latestLotteryJob) {
    return [];
  }

  const positionAssignments = await prisma.lotteryResults.groupBy({
    by: ['positionId'],
    where: {
      lotteryJobId: latestLotteryJob.id
    },
    _count: {
      positionId: true
    }
  });

  const assignmentMap = new Map(positionAssignments.map((assignment) => [assignment.positionId, assignment._count.positionId]));

  // Get all positions and their assignments
  // Exclude internal testers
  const positions = await prisma.position.findMany({
    where: {
      eventId: activeEvent.id,
      isPublished: true,
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
          company: {
            select: {
              companyName: true
            }
          }
        }
      }
    }
  });

  const availableSlots = positions
    .map((position) => {
      const assignedCount = assignmentMap.get(position.id) ?? 0;
      return {
        positionId: position.id,
        title: position.title,
        companyName: position.host.company?.companyName || 'Unknown',
        slots: position.slots,
        assigned: assignedCount,
        available: position.slots - assignedCount
      };
    })
    .filter(p => p.available > 0)
    .sort((a, b) => b.available - a.available);

  return availableSlots;
}

/**
 * Get detailed student data for individual message
 */
export async function getStudentDetailedData(studentId: string, schoolId: string) {
  const activeEvent = await prisma.event.findFirst({
    where: {
      schoolId,
      isActive: true
    }
  });

  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      schoolId
    },
    include: {
      user: {
        select: {
          email: true,
          lastLogin: true
        }
      },
      positionsSignedUpFor: {
        where: {
          position: {
            eventId: activeEvent?.id
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
          eventId: activeEvent?.id
        },
        take: 1
      }
    }
  });

  if (!student) {
    return null;
  }

  let lotteryAssignment = null;

  if (activeEvent) {
    const latestLotteryJob = await prisma.lotteryJob.findFirst({
      where: {
        eventId: activeEvent.id,
        status: 'COMPLETED'
      },
      orderBy: {
        completedAt: 'desc'
      }
    });

    if (latestLotteryJob) {
      lotteryAssignment = await prisma.lotteryResults.findFirst({
        where: {
          studentId: student.id,
          lotteryJobId: latestLotteryJob.id
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
        }
      });
    }
  }

  const assignedPosition = lotteryAssignment?.position;
  const hasLotteryResult = Boolean(assignedPosition && assignedPosition.eventId === activeEvent?.id);

  return {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    email: student.user!.email,
    phone: student.phone,
    parentEmail: student.parentEmail,
    lastLogin: student.user!.lastLogin,
    permissionSlipComplete: student.permissionSlips.length > 0,
    picks: student.positionsSignedUpFor.map(p => ({
      rank: p.rank,
      title: p.position.title,
      companyName: p.position.host.company?.companyName || 'Unknown',
      slots: p.position.slots,
      contactName: p.position.contact_name,
      contactEmail: p.position.contact_email
    })),
    lotteryAssignment: hasLotteryResult ? {
      title: assignedPosition!.title,
      companyName: assignedPosition!.host.company?.companyName || 'Unknown',
      contactName: assignedPosition!.contact_name,
      contactEmail: assignedPosition!.contact_email,
      address: assignedPosition!.address,
      instructions: assignedPosition!.instructions,
      attire: assignedPosition!.attire,
      arrival: assignedPosition!.arrival,
      start: assignedPosition!.start,
      end: assignedPosition!.end
    } : null
  };
}

/**
 * Get detailed company/host data for individual message
 */
export async function getCompanyDetailedData(companyId: string, schoolId: string) {
  const activeEvent = await prisma.event.findFirst({
    where: {
      schoolId,
      isActive: true
    }
  });

  const company = await prisma.company.findFirst({
    where: {
      id: companyId,
      schoolId
    },
    include: {
      hosts: {
        include: {
          user: {
            select: {
              email: true,
              lastLogin: true
            }
          },
          positions: {
            where: {
              eventId: activeEvent?.id
            },
            include: {
              students: {
                include: {
                  student: {
                    select: {
                      firstName: true,
                      lastName: true,
                      phone: true,
                      parentEmail: true,
                      user: {
                        select: {
                          email: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  if (!company) {
    return null;
  }

  const accountHolder = company.hosts[0];
  
  return {
    id: company.id,
    companyName: company.companyName,
    companyDescription: company.companyDescription,
    companyUrl: company.companyUrl,
    accountHolderName: accountHolder?.name || '',
    accountHolderEmail: accountHolder?.user.email || '',
    lastLogin: accountHolder?.user.lastLogin,
    positions: accountHolder?.positions.map(p => ({
      id: p.id,
      title: p.title,
      slots: p.slots,
      contactName: p.contact_name,
      contactEmail: p.contact_email,
      assignedStudents: p.students.map(s => ({
        firstName: s.student.firstName,
        lastName: s.student.lastName,
        email: s.student.user!.email,
        phone: s.student.phone,
        parentEmail: s.student.parentEmail
      }))
    })) || []
  };
}

/**
 * Format student data as text for email insertion
 */
export function formatStudentDataForEmail(student: Awaited<ReturnType<typeof getStudentDetailedData>>): string {
  if (!student) return '';

  let text = `Student: ${student.firstName} ${student.lastName}\n`;
  text += `Email: ${student.email}\n`;
  text += `Phone: ${student.phone}\n`;
  text += `Parent Email: ${student.parentEmail}\n`;
  text += `Permission Slip: ${student.permissionSlipComplete ? 'Complete' : 'Not Complete'}\n\n`;

  if (student.picks.length > 0) {
    text += `Position Picks:\n`;
    student.picks.forEach(pick => {
      text += `  ${pick.rank}. ${pick.title} at ${pick.companyName} (${pick.slots} slots)\n`;
    });
    text += '\n';
  }

  if (student.lotteryAssignment) {
    text += `Lottery Assignment:\n`;
    text += `  Position: ${student.lotteryAssignment.title}\n`;
    text += `  Company: ${student.lotteryAssignment.companyName}\n`;
    text += `  Contact: ${student.lotteryAssignment.contactName} (${student.lotteryAssignment.contactEmail})\n`;
    text += `  Address: ${student.lotteryAssignment.address}\n`;
    text += `  Arrival: ${student.lotteryAssignment.arrival}\n`;
    text += `  Hours: ${student.lotteryAssignment.start} - ${student.lotteryAssignment.end}\n`;
    text += `  Attire: ${student.lotteryAssignment.attire}\n`;
    if (student.lotteryAssignment.instructions) {
      text += `  Instructions: ${student.lotteryAssignment.instructions}\n`;
    }
  }

  return text;
}

/**
 * Format company data as text for email insertion
 */
export function formatCompanyDataForEmail(company: Awaited<ReturnType<typeof getCompanyDetailedData>>): string {
  if (!company) return '';

  let text = `Company: ${company.companyName}\n`;
  if (company.companyDescription) {
    text += `Description: ${company.companyDescription}\n`;
  }
  if (company.companyUrl) {
    text += `Website: ${company.companyUrl}\n`;
  }
  text += `\nAccount Holder: ${company.accountHolderName}\n`;
  text += `Email: ${company.accountHolderEmail}\n\n`;

  if (company.positions.length > 0) {
    text += `Positions for Current Event:\n`;
    company.positions.forEach(pos => {
      text += `\n  ${pos.title} (${pos.slots} slots)\n`;
      text += `  Contact: ${pos.contactName} (${pos.contactEmail})\n`;
      if (pos.assignedStudents.length > 0) {
        text += `  Assigned Students:\n`;
        pos.assignedStudents.forEach(s => {
          text += `    - ${s.firstName} ${s.lastName} (${s.email}, ${s.phone})\n`;
        });
      } else {
        text += `  No students assigned yet\n`;
      }
    });
  } else {
    text += `No positions for current event.\n`;
  }

  return text;
}

