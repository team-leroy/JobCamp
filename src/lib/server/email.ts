import { env } from "$env/dynamic/private";
import { MailtrapClient } from "mailtrap";
import verificationEmail from "$lib/emails/emailVerification.html?raw";
import resetPasswordEmail from "$lib/emails/resetPassword.html?raw";
import permissionSlipEmail from "$lib/emails/permissionSlip.html?raw";
import positionUpdateEmail from "$lib/emails/positionUpdate.html?raw";
import hostEmailTemp from "$lib/emails/hostEmailTemp.html?raw";
import lotteryResults from "$lib/emails/lotteryResults.html?raw";

export const emailClient = new MailtrapClient({ token: env.MAILTRAP_TOKEN || '' });

export const SENDER = { name: "JobCamp", email: "admin@jobcamp.org" };

export type EmailParams = { [index: string]: string }

interface Position {
    contact_email: string;
    [key: string]: string;
}

interface HostInfo {
    [key: string]: string;
}

export function renderEmailTemplate(emailHtml: string, params: EmailParams) {
    Object.getOwnPropertyNames(params).forEach(name => {
        emailHtml = emailHtml.replaceAll("${"+name+"}", params[name]);
    });
    return emailHtml;
}

export async function sendEmailLotteryEmail(email:string) {
    await emailClient.send({
        from: SENDER,
        to:  [{ email: email }],
        subject: "JobCamp lottery results are out!",
        html: lotteryResults
    });
}

export async function sendEmailVerificationEmail(uid: string, email: string, code: string) {
    try {
        await emailClient.send({
            from: SENDER,
            to:  [{ email: email }],
            subject: "Verify JobCamp Email",
            html: renderEmailTemplate(verificationEmail, {uid, code})
        });
    } catch (error) {
        console.warn('Email service not configured or failed to send verification email:', error);
        // In development, we can continue without email verification
        // In production, you should have proper email service configured
    }
}

export async function sendPasswordResetEmail(uid: string, email: string, code: string) {
    try {
        await emailClient.send({
            from: SENDER,
            to:  [{ email: email }],
            subject: "Reset JobCamp Password",
            html: renderEmailTemplate(resetPasswordEmail, {uid, code})
        });
    } catch (error) {
        console.warn('Email service not configured or failed to send password reset email:', error);
    }
}

export async function sendPermissionSlipEmail(parentEmail: string, code: string, name: string) {
    await emailClient.send({
        from: SENDER,
        to:  [{ email: parentEmail }],
        subject: `Permission Slip for ${name}`,
        html: renderEmailTemplate(permissionSlipEmail, {link: "https://jobcamp.org/permission-slip/"+code, name: name}) // Change url
    });
}

export async function sendPositionUpdateEmail(hostEmail: string, position: Position) {
    if (hostEmail != position.contact_email) {
        await emailClient.send({
            from: SENDER,
            to:  [{ email: position.contact_email }],
            subject: "JobCamp.org position created/updated for March 10, 2025",
            html: renderEmailTemplate(positionUpdateEmail, position)
        });
    }

    await emailClient.send({
        from: SENDER,
        to:  [{ email: hostEmail }],
        subject: "JobCamp.org position created/updated for March 10, 2025",
        html: renderEmailTemplate(positionUpdateEmail, position)
    });
}

export async function sendHostEmail(hostEmail: string, info: HostInfo) {
    // console.log(hostEmail, renderEmailTemplate(hostEmailTemp, info), "\n\n\n\n\n");
    await emailClient.send({
        from: SENDER,
        to:  [{ email: hostEmail }],
        subject: "Job Shadow Day update",
        html: renderEmailTemplate(hostEmailTemp, info)
    });
}