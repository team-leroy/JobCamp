import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { canAccessFullAdminFeatures } from '$lib/server/roleUtils';
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
    getAllCompanyContactsForEvent,
    getStudentDetailedData,
    getCompanyDetailedData,
    formatStudentDataForEmail,
    formatCompanyDataForEmail,
    type StudentRecipient
} from '$lib/server/messaging';

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
                    recipients = await getAllCompanyContactsForEvent(schoolId);
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
                // Filter students who opted in to SMS
                const smsRecipients = students
                    .filter(s => s.allowPhoneMessaging && s.phone)
                    .map(s => s.phone);

                if (smsRecipients.length === 0) {
                    return { success: false, message: 'No students have opted in to receive SMS messages' };
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

            await prisma.message.create({
                data: {
                    senderId: locals.user.id,
                    senderEmail: userInfo!.email,
                    schoolId,
                    eventId: activeEvent?.id,
                    messageType: messageType === 'email' ? 'EMAIL' : 'SMS',
                    recipientType: recipientType.toUpperCase().replace(/_/g, '_') as 'STUDENTS' | 'STUDENTS_INCOMPLETE_PERMISSION_SLIP' | 'STUDENTS_NO_PICKS' | 'STUDENTS_FEW_PICKS' | 'STUDENTS_FEW_SLOTS',
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
            
            const subject = formData.get('subject')?.toString();
            const message = formData.get('message')?.toString();

            if (!subject || !message) {
                return { success: false, message: 'Subject and message are required' };
            }

            // Get all company contacts for the active event
            const contacts = await getAllCompanyContactsForEvent(schoolId);

            if (contacts.length === 0) {
                return { success: false, message: 'No company contacts found for the active event' };
            }

            const emailRecipients = contacts.map(c => ({
                email: c.email,
                name: c.name
            }));

            const result = await sendBulkEmail({
                to: emailRecipients,
                subject,
                html: message.replace(/\n/g, '<br>')
            });

            if (!result.success) {
                return { success: false, message: result.error || 'Failed to send emails' };
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
                    recipientType: 'COMPANIES_ALL',
                    recipientCount: emailRecipients.length,
                    subject,
                    status: 'sent'
                }
            });

            return {
                success: true,
                message: `Successfully sent email to ${emailRecipients.length} company contact(s)`
            };
        } catch (error) {
            console.error('Error sending company message:', error);
            return { success: false, message: 'Failed to send message' };
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
