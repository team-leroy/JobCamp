import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { getSignedUrl } from '../../../../dashboard/storage';

/**
 * Secure download endpoint for attachments
 * Allows: (1) students assigned to the position, or (2) admins of the position's school
 */
export const GET: RequestHandler = async ({ locals, params }) => {
    // Check authentication
    if (!locals.user) {
        error(401, 'Unauthorized');
    }

    const attachmentId = params.attachmentId;
    if (!attachmentId) {
        error(400, 'Attachment ID required');
    }

    // Get the attachment with position and event (for schoolId)
    const attachment = await prisma.attachment.findUnique({
        where: { id: attachmentId },
        include: {
            position: {
                include: {
                    event: true
                }
            }
        }
    });

    if (!attachment) {
        error(404, 'Attachment not found');
    }

    const schoolId = attachment.position.event.schoolId;

    // Allow admins of this school to download any position attachment
    const userWithAdmin = await prisma.user.findUnique({
        where: { id: locals.user.id },
        select: { adminOfSchools: { select: { id: true } } }
    });
    const isAdminOfSchool = userWithAdmin?.adminOfSchools?.some((s) => s.id === schoolId) ?? false;
    if (isAdminOfSchool) {
        // Admin path: generate signed URL and redirect
        let signedUrl: string;
        try {
            signedUrl = await getSignedUrl(attachment.storagePath, 60);
        } catch (err) {
            console.error('Error generating signed URL:', err);
            error(500, 'Failed to generate download link');
        }
        redirect(302, signedUrl!);
    }

    // Student path: must be assigned to this position
    const student = await prisma.student.findFirst({
        where: { userId: locals.user.id }
    });

    if (!student) {
        error(403, 'Only students or school admins can download attachments');
    }

    if (!attachment.position.event.lotteryPublished) {
        error(403, 'Attachments are only available after the lottery is published');
    }

    const lotteryJob = await prisma.lotteryJob.findFirst({
        where: { 
            eventId: attachment.position.event.id 
        },
        orderBy: { completedAt: 'desc' }
    });

    if (!lotteryJob) {
        error(403, 'No lottery results found for this event');
    }

    const lotteryResult = await prisma.lotteryResults.findFirst({
        where: {
            studentId: student.id,
            lotteryJobId: lotteryJob.id,
            positionId: attachment.positionId
        }
    });

    if (!lotteryResult) {
        error(403, 'You are not assigned to this position');
    }

    // Generate signed URL (valid for 1 hour)
    let signedUrl: string;
    try {
        signedUrl = await getSignedUrl(attachment.storagePath, 60);
    } catch (err) {
        console.error('Error generating signed URL:', err);
        error(500, 'Failed to generate download link');
    }
    
    // Redirect to the signed URL (redirect() throws in SvelteKit, which is normal - don't catch it)
    redirect(302, signedUrl!);
};

