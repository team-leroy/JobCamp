import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { canAccessFullAdminFeatures } from '$lib/server/roleUtils';
import { getCurrentGrade } from '$lib/server/gradeUtils';
import { sendBulkEmail } from '$lib/server/sendgrid';
import { sendBulkSMS } from '$lib/server/twilio';
import {
    getAllStudents,
    getStudentsWithIncompletePermissionSlip,
    getStudentsWithNoJobPicks,
    getStudentsWithFewPicks,
    getStudentsWithFewSlots,
    getStudentsAssignedInLottery,
    getStudentsUnassignedInLottery,
    getCompanyRecipientsByGroup,
    getStudentDetailedData,
    getCompanyDetailedData,
    formatStudentDataForEmail,
    formatCompanyDataForEmail,
    type StudentRecipient
} from '$lib/server/messaging';
import type { RecipientType } from '@prisma/client';

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

    // Check if user has full admin access (read-only admins cannot access messaging)
    if (!canAccessFullAdminFeatures(userInfo)) {
        redirect(302, "/dashboard");
    }

    const schoolId = userInfo.adminOfSchools[0].id;

    // Get active event
    const activeEvent = await prisma.event.findFirst({
        where: {
            schoolId,
            isActive: true
        }
    });

    // Check if lottery has been run
    const hasLotteryResults = activeEvent ? await prisma.lotteryJob.findFirst({
        where: {
            eventId: activeEvent.id,
            status: 'COMPLETED'
        }
    }) : null;

    // Get all students and companies for individual messaging
    const students = await getAllStudents(schoolId);
    const companies = await prisma.company.findMany({
        where: { schoolId },
        select: {
            id: true,
            companyName: true
        },
        orderBy: {
            companyName: 'asc'
        }
    });

    return {
        isAdmin: true,
        loggedIn: true,
        isHost: !!locals.user.host,
        userRole: userInfo.role,
        schoolId,
        activeEvent: activeEvent ? {
            id: activeEvent.id,
            name: activeEvent.name,
            date: activeEvent.date
        } : null,
        hasLotteryResults: !!hasLotteryResults,
        students: students.map(s => ({
            id: s.id,
            name: `${s.firstName} ${s.lastName}`,
            email: s.email
        })),
        companies: companies.map(c => ({
            id: c.id,
            name: c.companyName
        }))
    };
};

export const actions: Actions = {
    previewRecipients: async ({ request, locals }) => {
        if (!locals.user) {
            return { success: false, message: 'Not authenticated' };
        }

        try {
            const userInfo = await prisma.user.findFirst({
                where: { id: locals.user.id },
                include: { adminOfSchools: true }
            });

            if (!canAccessFullAdminFeatures(userInfo!)) {
                return { success: false, message: 'Not authorized' };
            }

            const schoolId = userInfo!.adminOfSchools[0].id;
            const formData = await request.formData();
            const recipientType = formData.get('recipientType')?.toString();

            let recipients: StudentRecipient[] | Array<{email: string; name: string}> = [];

            switch (recipientType) {
                case 'all_students':
                    recipients = await getAllStudents(schoolId);
                    break;
                case 'incomplete_permission_slip':
                    recipients = await getStudentsWithIncompletePermissionSlip(schoolId);
                    break;
                case 'no_job_picks':
                    recipients = await getStudentsWithNoJobPicks(schoolId);
                    break;
                case 'few_picks':
                    recipients = await getStudentsWithFewPicks(schoolId, 3);
                    break;
                case 'few_slots':
                    recipients = await getStudentsWithFewSlots(schoolId, 5);
                    break;
                case 'lottery_assigned':
                    recipients = await getStudentsAssignedInLottery(schoolId);
                    break;
                case 'lottery_unassigned':
                    recipients = await getStudentsUnassignedInLottery(schoolId);
                    break;
                case 'all_company_contacts':
                case 'all_companies':
                case 'published_positions':
                case 'draft_positions':
                case 'no_positions':
                case 'students_attending':
                    recipients = await getCompanyRecipientsByGroup(schoolId, recipientType);
                    break;
                default:
                    return { success: false, message: 'Invalid recipient type' };
            }

            // Map recipients to preview format
            const preview = recipients.slice(0, 10).map(r => {
                // StudentRecipient has firstName/lastName
                if ('firstName' in r && 'lastName' in r) {
                    return {
                        name: `${r.firstName} ${r.lastName}`,
                        email: r.email,
                        phone: r.phone
                    };
                }
                // Company/Host contacts have name property
                return {
                    name: r.name || 'Unknown',
                    email: r.email,
                    phone: undefined
                };
            });

            return {
                success: true,
                count: recipients.length,
                preview
            };
        } catch (error) {
            console.error('Error previewing recipients:', error);
            return { success: false, message: 'Failed to preview recipients' };
        }
    },

    sendStudentMessage: async ({ request, locals }) => {
        if (!locals.user) {
            return { success: false, message: 'Not authenticated' };
        }

        try {
            const userInfo = await prisma.user.findFirst({
                where: { id: locals.user.id },
                include: { adminOfSchools: true }
            });

            if (!canAccessFullAdminFeatures(userInfo!)) {
                return { success: false, message: 'Not authorized' };
            }

            const schoolId = userInfo!.adminOfSchools[0].id;
            const formData = await request.formData();
            
            const recipientType = formData.get('recipientType')?.toString();
            const messageType = formData.get('messageType')?.toString(); // 'email' or 'sms'
            const subject = formData.get('subject')?.toString();
            const message = formData.get('message')?.toString();
            const includeParents = formData.get('includeParents') === 'true';

            if (!recipientType || !messageType || !message) {
                return { success: false, message: 'Missing required fields' };
            }

            if (messageType === 'email' && !subject) {
                return { success: false, message: 'Subject is required for emails' };
            }

            // Get recipients based on type
            let students: Awaited<ReturnType<typeof getAllStudents>> = [];
            
            switch (recipientType) {
                case 'all_students':
                    students = await getAllStudents(schoolId);
                    break;
                case 'incomplete_permission_slip':
                    students = await getStudentsWithIncompletePermissionSlip(schoolId);
                    break;
                case 'no_job_picks':
                    students = await getStudentsWithNoJobPicks(schoolId);
                    break;
                case 'few_picks':
                    students = await getStudentsWithFewPicks(schoolId, 3);
                    break;
                case 'few_slots':
                    students = await getStudentsWithFewSlots(schoolId, 5);
                    break;
                default:
                    return { success: false, message: 'Invalid recipient type' };
            }

            if (students.length === 0) {
                return { success: false, message: 'No recipients match the selected criteria' };
            }

            let successCount = 0;
            let failCount = 0;

            if (messageType === 'email') {
                // Collect email addresses
                const emailRecipients = [];
                
                for (const student of students) {
                    emailRecipients.push({
                        email: student.email,
                        name: `${student.firstName} ${student.lastName}`
                    });
                    
                    if (includeParents && student.parentEmail) {
                        emailRecipients.push({
                            email: student.parentEmail,
                            name: `${student.firstName} ${student.lastName} (Parent)`
                        });
                    }
                }

                const result = await sendBulkEmail({
                    to: emailRecipients,
                    subject: subject!,
                    html: message.replace(/\n/g, '<br>')
                });

                if (result.success) {
                    successCount = emailRecipients.length;
                } else {
                    return { success: false, message: result.error || 'Failed to send emails' };
                }
            } else if (messageType === 'sms') {
                // All students have agreed to SMS by signing up, just check for phone numbers
                const smsRecipients = students
                    .filter(s => s.phone)
                    .map(s => s.phone);

                if (smsRecipients.length === 0) {
                    return { success: false, message: 'No students have phone numbers' };
                }

                const result = await sendBulkSMS(smsRecipients, message);
                successCount = result.sent;
                failCount = result.failed;

                if (!result.success) {
                    return {
                        success: false,
                        message: `Sent to ${result.sent} recipients, failed for ${result.failed}. Errors: ${result.errors.slice(0, 3).join('; ')}`
                    };
                }
            }

            // Log the message
            const activeEvent = await prisma.event.findFirst({
                where: { schoolId, isActive: true }
            });

            const recipientTypeMapping: Record<string, string> = {
                'all_students': 'STUDENTS',
                'incomplete_permission_slip': 'STUDENTS_INCOMPLETE_PERMISSION_SLIP',
                'no_job_picks': 'STUDENTS_NO_PICKS',
                'few_picks': 'STUDENTS_FEW_PICKS',
                'few_slots': 'STUDENTS_FEW_SLOTS',
                'lottery_assigned': 'POST_LOTTERY_ASSIGNED',
                'lottery_unassigned': 'POST_LOTTERY_UNASSIGNED'
            };

            await prisma.message.create({
                data: {
                    senderId: locals.user.id,
                    senderEmail: userInfo!.email,
                    schoolId,
                    eventId: activeEvent?.id,
                    messageType: messageType === 'email' ? 'EMAIL' : 'SMS',
                    recipientType: (recipientTypeMapping[recipientType] || 'STUDENTS') as RecipientType,
                    recipientCount: successCount,
                    subject: subject || null,
                    includeParents: includeParents,
                    status: failCount > 0 ? 'partial' : 'sent'
                }
            });

            return {
                success: true,
                message: `Successfully sent ${messageType} to ${successCount} recipient(s)${failCount > 0 ? ` (${failCount} failed)` : ''}`
            };
        } catch (error) {
            console.error('Error sending student message:', error);
            return { success: false, message: 'Failed to send message' };
        }
    },

    sendCompanyMessage: async ({ request, locals }) => {
        if (!locals.user) {
            return { success: false, message: 'Not authenticated' };
        }

        try {
            const userInfo = await prisma.user.findFirst({
                where: { id: locals.user.id },
                include: { adminOfSchools: true }
            });

            if (!canAccessFullAdminFeatures(userInfo!)) {
                return { success: false, message: 'Not authorized' };
            }

            const schoolId = userInfo!.adminOfSchools[0].id;
            const formData = await request.formData();
            
            const recipientType = formData.get('recipientType')?.toString() || 'all_companies';
            const subject = formData.get('subject')?.toString();
            const message = formData.get('message')?.toString();

            if (!subject || !message) {
                return { success: false, message: 'Subject and message are required' };
            }

            // Get recipients based on group
            const contacts = await getCompanyRecipientsByGroup(schoolId, recipientType);

            if (contacts.length === 0) {
                return { success: false, message: 'No company contacts found for the selected criteria' };
            }

            const activeEvent = await prisma.event.findFirst({
                where: { schoolId, isActive: true }
            });

            let successCount = 0;

            if (recipientType === 'students_attending' && message.includes('{student_list}')) {
                // Personalization required
                const companies = new Set(contacts.map(c => c.companyId).filter(Boolean));
                
                for (const companyId of companies) {
                    const companyContacts = contacts.filter(c => c.companyId === companyId);
                    if (companyContacts.length === 0) continue;

                    // Generate personalization data for this company
                    const personalizationData = await prisma.company.findUnique({
                        where: { id: companyId! },
                        include: {
                            hosts: {
                                include: {
                                    positions: {
                                        where: { eventId: activeEvent?.id },
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

                    if (!personalizationData) continue;

                    const eventDate = activeEvent ? new Date(activeEvent.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                    }) : '{date}';

                    let studentListHtml = '';
                    let positionDetailsHtml = '<br><strong>Position Details:</strong><br>----------------<br><br>';
                    let numStudents = 0;
                    personalizationData.hosts.forEach(h => {
                        h.positions.forEach(pos => {
                            if (pos.lotteryAssignments.length > 0) {
                                numStudents += pos.lotteryAssignments.length;
                                
                                // Build student list
                                pos.lotteryAssignments.forEach(assignment => {
                                    const s = assignment.student;
                                    const grade = s.graduatingClassYear ? getCurrentGrade(s.graduatingClassYear, activeEvent!.date) : 'N/A';
                                    studentListHtml += `${s.firstName} ${s.lastName}, Grade ${grade} (${s.user?.email || 'No Email'}${s.phone ? `, ${s.phone}` : ''}) - Assigned to: ${pos.title}<br><br>`;
                                });

                                // Build position details
                                positionDetailsHtml += `<strong>Position: ${pos.title}</strong><br>`;
                                positionDetailsHtml += `Address: ${pos.address}<br>`;
                                positionDetailsHtml += `Arrival: ${pos.arrival}<br>`;
                                positionDetailsHtml += `Time: ${pos.start} - ${pos.end}<br>`;
                                if (pos.attire) positionDetailsHtml += `Attire: ${pos.attire}<br>`;
                                if (pos.instructions) positionDetailsHtml += `Instructions: ${pos.instructions}<br>`;
                                positionDetailsHtml += `<br><hr><br>`;
                            }
                        });
                    });

                    const personalizedMessage = message
                        .replace(/{host_name}/g, personalizationData.hosts[0]?.name || 'Partner')
                        .replace(/{event_date}/g, eventDate)
                        .replace(/{num_students}/g, numStudents.toString())
                        .replace(/{student_list}/g, studentListHtml + positionDetailsHtml);

                    const emailRecipients = companyContacts.map(c => ({
                        email: c.email,
                        name: c.name
                    }));

                    const result = await sendBulkEmail({
                        to: emailRecipients,
                        subject,
                        html: personalizedMessage.replace(/\n/g, '<br>')
                    });

                    if (result.success) {
                        successCount += emailRecipients.length;
                    }
                }
            } else {
                // Regular bulk email
            const emailRecipients = contacts.map(c => ({
                email: c.email,
                name: c.name
            }));

            const result = await sendBulkEmail({
                to: emailRecipients,
                subject,
                html: message.replace(/\n/g, '<br>')
            });

                if (result.success) {
                    successCount = emailRecipients.length;
                } else {
                return { success: false, message: result.error || 'Failed to send emails' };
                }
            }

            // Log the message
            const recipientTypeMapping: Record<string, string> = {
                'all_companies': 'COMPANIES_ALL',
                'published_positions': 'COMPANIES_PUBLISHED',
                'draft_positions': 'COMPANIES_DRAFT',
                'no_positions': 'COMPANIES_NO_POSITION',
                'students_attending': 'COMPANIES_STUDENTS_ATTENDING',
                'all_company_contacts': 'COMPANIES_ALL'
            };

            await prisma.message.create({
                data: {
                    senderId: locals.user.id,
                    senderEmail: userInfo!.email,
                    schoolId,
                    eventId: activeEvent?.id,
                    messageType: 'EMAIL',
                    recipientType: (recipientTypeMapping[recipientType] || 'COMPANIES_ALL') as RecipientType,
                    recipientCount: successCount,
                    subject,
                    status: 'sent'
                }
            });

            return {
                success: true,
                message: `Successfully sent email to ${successCount} company contact(s)`
            };
        } catch (error) {
            console.error('Error sending company message:', error);
            return { success: false, message: 'Failed to send message' };
        }
    },

    loadCompanyTemplate: async ({ locals, request }) => {
        if (!locals.user) {
            return { success: false, message: 'Not authenticated' };
        }

        try {
            const userInfo = await prisma.user.findFirst({
                where: { id: locals.user.id },
                include: { adminOfSchools: true }
            });

            if (!canAccessFullAdminFeatures(userInfo!)) {
                return { success: false, message: 'Not authorized' };
            }

            const formData = await request.formData();
            const group = formData.get('group')?.toString();

            if (group === 'students_attending') {
                const template = `Dear {host_name},\n\n    The following {num_students} students have been selected to attend your JobCamp session on {event_date}:\n\n{student_list}\n\nJobCamp Team\nadmin@jobcamp.org`;
                return { success: true, data: template };
            }

            return { success: true, data: '' };
        } catch (error) {
            console.error('Error loading company template:', error);
            return { success: false, message: 'Failed to load template' };
        }
    },

    sendIndividualMessage: async ({ request, locals }) => {
        if (!locals.user) {
            return { success: false, message: 'Not authenticated' };
        }

        try {
            const userInfo = await prisma.user.findFirst({
                where: { id: locals.user.id },
                include: { adminOfSchools: true }
            });

            if (!canAccessFullAdminFeatures(userInfo!)) {
                return { success: false, message: 'Not authorized' };
            }

            const schoolId = userInfo!.adminOfSchools[0].id;
            const formData = await request.formData();
            
            const recipientId = formData.get('recipientId')?.toString();
            const recipientType = formData.get('recipientType')?.toString(); // 'student' or 'company'
            const subject = formData.get('subject')?.toString();
            const message = formData.get('message')?.toString();

            if (!recipientId || !recipientType || !subject || !message) {
                return { success: false, message: 'All fields are required' };
            }

            let emailRecipient: { email: string; name: string } | null = null;
            let recipientTypeEnum: string;

            if (recipientType === 'student') {
                const student = await prisma.student.findFirst({
                    where: { id: recipientId, schoolId },
                    include: {
                        user: { select: { email: true } }
                    }
                });

                if (!student) {
                    return { success: false, message: 'Student not found' };
                }

                emailRecipient = {
                    email: student.user!.email,
                    name: `${student.firstName} ${student.lastName}`
                };
                recipientTypeEnum = 'INDIVIDUAL_STUDENT';
            } else if (recipientType === 'company') {
                const company = await prisma.company.findFirst({
                    where: { id: recipientId, schoolId },
                    include: {
                        hosts: {
                            include: {
                                user: { select: { email: true } }
                            },
                            take: 1
                        }
                    }
                });

                if (!company || !company.hosts[0]) {
                    return { success: false, message: 'Company or account holder not found' };
                }

                emailRecipient = {
                    email: company.hosts[0].user.email,
                    name: company.hosts[0].name
                };
                recipientTypeEnum = 'INDIVIDUAL_COMPANY';
            } else {
                return { success: false, message: 'Invalid recipient type' };
            }

            const result = await sendBulkEmail({
                to: [emailRecipient],
                subject,
                html: message.replace(/\n/g, '<br>')
            });

            if (!result.success) {
                return { success: false, message: result.error || 'Failed to send email' };
            }

            // Log the message
            const activeEvent = await prisma.event.findFirst({
                where: { schoolId, isActive: true }
            });

            await prisma.message.create({
                data: {
                    senderId: locals.user.id,
                    senderEmail: userInfo!.email,
                    schoolId,
                    eventId: activeEvent?.id,
                    messageType: 'EMAIL',
                    recipientType: recipientTypeEnum as 'INDIVIDUAL_STUDENT' | 'INDIVIDUAL_COMPANY',
                    recipientCount: 1,
                    subject,
                    status: 'sent'
                }
            });

            return {
                success: true,
                message: `Successfully sent email to ${emailRecipient.name}`
            };
        } catch (error) {
            console.error('Error sending individual message:', error);
            return { success: false, message: 'Failed to send message' };
        }
    },

    loadIndividualData: async ({ request, locals }) => {
        if (!locals.user) {
            return { success: false, message: 'Not authenticated' };
        }

        try {
            const userInfo = await prisma.user.findFirst({
                where: { id: locals.user.id },
                include: { adminOfSchools: true }
            });

            if (!canAccessFullAdminFeatures(userInfo!)) {
                return { success: false, message: 'Not authorized' };
            }

            const schoolId = userInfo!.adminOfSchools[0].id;
            const formData = await request.formData();
            
            const recipientId = formData.get('recipientId')?.toString();
            const recipientType = formData.get('recipientType')?.toString();

            if (!recipientId || !recipientType) {
                return { success: false, message: 'Recipient ID and type are required' };
            }

            let formattedData = '';

            if (recipientType === 'student') {
                const student = await getStudentDetailedData(recipientId, schoolId);
                if (!student) {
                    return { success: false, message: 'Student not found' };
                }
                formattedData = formatStudentDataForEmail(student);
            } else if (recipientType === 'company') {
                const company = await getCompanyDetailedData(recipientId, schoolId);
                if (!company) {
                    return { success: false, message: 'Company not found' };
                }
                formattedData = formatCompanyDataForEmail(company);
            } else {
                return { success: false, message: 'Invalid recipient type' };
            }

            return {
                success: true,
                data: formattedData
            };
        } catch (error) {
            console.error('Error loading individual data:', error);
            return { success: false, message: 'Failed to load data' };
        }
    }
};
