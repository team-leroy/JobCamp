/**
 * Messaging Service
 * Handles recipient filtering and message composition for the messaging system
 */

import { prisma } from './prisma';

export interface StudentRecipient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  parentEmail: string;
  allowPhoneMessaging: boolean;
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
    parentEmail: s.parentEmail,
    allowPhoneMessaging: s.allowPhoneMessaging
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
    parentEmail: s.parentEmail,
    allowPhoneMessaging: s.allowPhoneMessaging
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
      permissionSlips: {
        some: {
          eventId: activeEvent.id
        }
      },
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

  return students.map(s => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.user!.email,
    phone: s.phone,
    parentEmail: s.parentEmail,
    allowPhoneMessaging: s.allowPhoneMessaging
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
    parentEmail: s.parentEmail,
    allowPhoneMessaging: s.allowPhoneMessaging
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
    parentEmail: s.parentEmail,
    allowPhoneMessaging: s.allowPhoneMessaging
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
  const students = await prisma.student.findMany({
    where: {
      schoolId,
      isActive: true,
      lotteryResult: {
        lotteryJobId: latestLotteryJob.id
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
    parentEmail: s.parentEmail,
    allowPhoneMessaging: s.allowPhoneMessaging
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

  // Get students who made picks but have no lottery result
  const students = await prisma.student.findMany({
    where: {
      schoolId,
      isActive: true,
      positionsSignedUpFor: {
        some: {
          position: {
            eventId: activeEvent.id
          }
        }
      },
      lotteryResult: {
        none: {
          lotteryJobId: latestLotteryJob.id
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
    parentEmail: s.parentEmail,
    allowPhoneMessaging: s.allowPhoneMessaging
  }));
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
  const activeEvent = await prisma.event.findFirst({
    where: {
      schoolId,
      isActive: true
    }
  });

  if (!activeEvent) {
    return [];
  }

  const contacts: Array<{
    email: string;
    name: string;
    companyName: string;
    type: 'account_holder' | 'host_contact';
  }> = [];

  const emailSet = new Set<string>();

  // Get all PUBLISHED positions for the active event
  // Only companies/hosts with published positions are considered active participants
  const positions = await prisma.position.findMany({
    where: {
      eventId: activeEvent.id,
      isPublished: true  // Only include published positions
    },
    include: {
      host: {
        include: {
          user: {
            select: {
              email: true
            }
          },
          company: {
            select: {
              companyName: true
            }
          }
        }
      }
    }
  });

  for (const position of positions) {
    const companyName = position.host.company?.companyName || 'Unknown Company';
    
    // Add account holder (host user email)
    const accountHolderEmail = position.host.user.email;
    if (accountHolderEmail && !emailSet.has(accountHolderEmail)) {
      emailSet.add(accountHolderEmail);
      contacts.push({
        email: accountHolderEmail,
        name: position.host.name,
        companyName,
        type: 'account_holder'
      });
    }

    // Add host contact (if different from account holder)
    const hostContactEmail = position.contact_email;
    if (hostContactEmail && !emailSet.has(hostContactEmail)) {
      emailSet.add(hostContactEmail);
      contacts.push({
        email: hostContactEmail,
        name: position.contact_name,
        companyName,
        type: 'host_contact'
      });
    }
  }

  return contacts;
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

  // Get all positions and their assignments
  const positions = await prisma.position.findMany({
    where: {
      eventId: activeEvent.id,
      isPublished: true
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
      },
      students: {
        where: {
          lotteryJobId: latestLotteryJob.id
        }
      }
    }
  });

  const availableSlots = positions
    .map(p => ({
      positionId: p.id,
      title: p.title,
      companyName: p.host.company?.companyName || 'Unknown',
      slots: p.slots,
      assigned: p.students.length,
      available: p.slots - p.students.length
    }))
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
      lotteryResult: {
        include: {
          host: {
            include: {
              company: true
            }
          }
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

  // Check if lottery result is for the active event
  const hasLotteryResult = student.lotteryResult && 
    student.lotteryResult.eventId === activeEvent?.id;

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
      title: student.lotteryResult.title,
      companyName: student.lotteryResult.host.company?.companyName || 'Unknown',
      contactName: student.lotteryResult.contact_name,
      contactEmail: student.lotteryResult.contact_email,
      address: student.lotteryResult.address,
      instructions: student.lotteryResult.instructions,
      attire: student.lotteryResult.attire,
      arrival: student.lotteryResult.arrival,
      start: student.lotteryResult.start,
      end: student.lotteryResult.end
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

