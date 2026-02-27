import { redirect, error } from '@sveltejs/kit';
import { Readable } from 'node:stream';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { getSignedUrl, getFile } from '../../../../dashboard/storage';

/**
 * Secure download endpoint for attachments
 * Allows: (1) students assigned to the position, or (2) admins of the position's school
 * Streams file from GCS so it works on Cloud Run without signBlob IAM.
 */
export const GET: RequestHandler = async ({ locals, params }) => {
    if (!locals.user) {
        error(401, 'Unauthorized');
    }

    const attachmentId = params.attachmentId;
    if (!attachmentId) {
        error(400, 'Attachment ID required');
    }

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

    const userWithAdmin = await prisma.user.findUnique({
        where: { id: locals.user.id },
        select: { adminOfSchools: { select: { id: true } } }
    });
    const isAdminOfSchool = userWithAdmin?.adminOfSchools?.some((s) => s.id === schoolId) ?? false;
    if (!isAdminOfSchool) {
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
            where: { eventId: attachment.position.event.id },
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
    }

    // Prefer signed URL when IAM allows (e.g. local dev); otherwise stream from GCS.
    // Cloud Run's default SA often lacks signBlob, so streaming is the reliable path.
    try {
        const signedUrl = await getSignedUrl(attachment.storagePath, 60);
        redirect(302, signedUrl);
    } catch {
        // Fallback: stream file through our server (no signBlob required)
        const file = getFile(attachment.storagePath);
        const [exists] = await file.exists().catch(() => [false]);
        if (!exists) {
            error(404, 'Attachment file not found in storage');
        }
        const nodeStream = file.createReadStream();
        const webStream = Readable.toWeb(nodeStream) as ReadableStream;
        const filename = attachment.fileName.replace(/"/g, '\\"');
        return new Response(webStream, {
            headers: {
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Type': 'application/octet-stream'
            }
        });
    }
};

