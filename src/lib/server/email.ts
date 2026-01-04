import { env } from "$env/dynamic/private";
import verificationEmail from "$lib/emails/emailVerification.html?raw";
import resetPasswordEmail from "$lib/emails/resetPassword.html?raw";
import permissionSlipEmail from "$lib/emails/permissionSlip.html?raw";
import positionUpdateEmail from "$lib/emails/positionUpdate.html?raw";
import lotteryResults from "$lib/emails/lotteryResults.html?raw";
import { prisma } from './prisma';

export const SENDER = { name: "JobCamp", email: "admin@jobcamp.org" };

/**
 * Send email using SendGrid
 */
async function sendEmailViaSendGrid(to: string, subject: string, html: string): Promise<void> {
    // Check if we're in sandbox mode - controlled by environment variable
    const isSandbox = env.SENDGRID_SANDBOX_MODE === 'true';
    
    // Wrap content in proper HTML tags to satisfy spam filters
    const fullHtml = `<!DOCTYPE html><html><body>${html}</body></html>`;
    // Create a plain-text version by stripping HTML tags
    const plainText = html.replace(/<[^>]*>?/gm, '').trim();

    const payload = {
        personalizations: [{
            to: [{ email: to }],
            subject: subject
        }],
        from: {
            email: env.SENDGRID_FROM_EMAIL || 'admin@jobcamp.org',
            name: env.SENDGRID_FROM_NAME || 'JobCamp'
        },
        content: [
            {
                type: 'text/plain',
                value: plainText
            },
            {
                type: 'text/html',
                value: fullHtml
            }
        ],
        tracking_settings: {
            click_tracking: {
                enable: false,
                enable_text: false
            }
        },
        mail_settings: {
            sandbox_mode: {
                enable: isSandbox
            }
        }
    };

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${env.SENDGRID_API_KEY || ''}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SendGrid API error: ${errorText}`);
    }

    if (isSandbox) {
        console.log('📧 [SANDBOX MODE] Transactional email would be sent to:', to);
        console.log('📧 Subject:', subject);
    }
}

export type EmailParams = { [index: string]: string }

interface Position {
    contact_email: string;
    [key: string]: string;
}

export interface EventEmailData {
    eventName: string;
    eventDate: string; // Formatted date
    schoolName: string;
    schoolId: string;
}

export interface ImportantDateData {
    date: string;
    time?: string;
    title: string;
    description: string;
}

export function renderEmailTemplate(emailHtml: string, params: EmailParams) {
    Object.getOwnPropertyNames(params).forEach(name => {
        emailHtml = emailHtml.replaceAll("${"+name+"}", params[name]);
    });
    return emailHtml;
}

/**
 * Format a date for display in emails
 */
export function formatEmailDate(date: Date): string {
    return new Date(date).toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
    });
}

/**
 * Calculate date relative to event date (e.g., "2 weeks before")
 */
export function calculateRelativeDate(eventDate: Date, weeksBefore: number): string {
    const date = new Date(eventDate);
    date.setDate(date.getDate() - (weeksBefore * 7));
    return formatEmailDate(date);
}

/**
 * Get statistics from the most recent completed (archived) event for a school
 */
export async function getPreviousEventStats(schoolId: string): Promise<string> {
    const previousEvent = await prisma.event.findFirst({
        where: {
            schoolId,
            isArchived: true,
            AND: [
                { name: { not: { contains: 'test' } } },
                { name: { not: { contains: 'mock' } } }
            ]
        },
        orderBy: {
            date: 'desc'
        },
        include: {
            positions: {
                include: {
                    students: true,
                    host: {
                        include: {
                            company: true
                        }
                    }
                }
            }
        }
    });

    if (!previousEvent) {
        return "Previous JobCamp events have successfully matched students with local companies.";
    }

    const year = new Date(previousEvent.date).getFullYear();
    const studentCount = new Set(previousEvent.positions.flatMap(p => p.students.map(s => s.studentId))).size;
    const companyCount = new Set(
        previousEvent.positions
            .filter(p => p.host.company)
            .map(p => p.host.company!.companyName)
    ).size;

    return `Our ${year} event placed ${studentCount} students to over ${companyCount} companies`;
}

/**
 * Format important dates for email display
 */
export function formatImportantDatesHtml(dates: ImportantDateData[]): string {
    if (dates.length === 0) {
        return '<li>Check your dashboard for upcoming deadlines</li>';
    }

    return dates.map(date => {
        const timeStr = date.time ? ` - ${date.time}` : '';
        return `<li>${date.date}${timeStr} - ${date.title}</li>`;
    }).join('\n            ');
}

export async function sendEmailLotteryEmail(email: string) {
    await sendEmailViaSendGrid(
        email,
        "JobCamp lottery results are out!",
        lotteryResults
    );
}

export async function sendEmailVerificationEmail(uid: string, email: string, code: string) {
    try {
        await sendEmailViaSendGrid(
            email,
            "Verify JobCamp Email",
            renderEmailTemplate(verificationEmail, {uid, code})
        );
    } catch (error) {
        console.warn('Email service not configured or failed to send verification email:', error);
    }
}

export async function sendPasswordResetEmail(uid: string, email: string, code: string) {
    try {
        await sendEmailViaSendGrid(
            email,
            "Reset JobCamp Password",
            renderEmailTemplate(resetPasswordEmail, {uid, code})
        );
    } catch (error) {
        console.warn('Email service not configured or failed to send password reset email:', error);
    }
}

export async function sendPermissionSlipEmail(
    parentEmail: string, 
    code: string, 
    name: string,
    eventData: EventEmailData
) {
    const previousEventStats = await getPreviousEventStats(eventData.schoolId);
    
    await sendEmailViaSendGrid(
        parentEmail,
        `Permission Slip for ${name}`,
        renderEmailTemplate(permissionSlipEmail, {
            link: "https://jobcamp.org/permission-slip/"+code,
            name: name,
            eventName: eventData.eventName,
            eventDate: eventData.eventDate,
            schoolName: eventData.schoolName,
            previousEventStats: previousEventStats
        })
    );
}

export async function sendPositionUpdateEmail(
    hostEmail: string, 
    position: Position,
    eventData: EventEmailData,
    rawEventDate: Date
) {
    const twoWeeksBefore = calculateRelativeDate(rawEventDate, 2);
    
    const emailParams = {
        ...position,
        eventName: eventData.eventName,
        eventDate: eventData.eventDate,
        schoolName: eventData.schoolName,
        assignmentNotificationDate: twoWeeksBefore
    };

    const emailHtml = renderEmailTemplate(positionUpdateEmail, emailParams);
    const subject = `JobCamp.org position published for ${eventData.eventDate}`;

    if (hostEmail != position.contact_email) {
        await sendEmailViaSendGrid(
            position.contact_email,
            subject,
            emailHtml
        );
    }

    await sendEmailViaSendGrid(
        hostEmail,
        subject,
        emailHtml
    );
}