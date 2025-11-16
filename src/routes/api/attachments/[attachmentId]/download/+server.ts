import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { getSignedUrl } from '../../../../dashboard/storage';

/**
 * Secure download endpoint for attachments
 * Verifies that the authenticated student is assigned to the position that owns the attachment
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

    // Get the attachment with position information
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

    // Check if user is a student
    const student = await prisma.student.findFirst({
        where: { userId: locals.user.id }
    });

    if (!student) {
        error(403, 'Only students can download attachments');
    }

    // Verify that the lottery is published for this event
    if (!attachment.position.event.lotteryPublished) {
        error(403, 'Attachments are only available after the lottery is published');
    }

    // Check if student is assigned to this position via lottery result
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

