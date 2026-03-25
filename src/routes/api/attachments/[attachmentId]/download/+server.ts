import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { getFile } from '../../../../dashboard/storage';

/**
 * Secure download endpoint for attachments.
 * Allows: (1) students assigned to the position, or (2) admins of the position's school.
 * Streams file from local storage.
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

    const file = getFile(attachment.storagePath);
    let exists = false;
    try {
        [exists] = await file.exists();
    } catch (err) {
        console.error('[attachment download] file.exists failed:', err);
        error(500, 'Storage unavailable');
    }
    if (!exists) {
        error(404, 'Attachment file not found in storage');
    }
    try {
        const stream = file.createReadStream();
        const { Readable } = await import('node:stream');
        const webStream = Readable.toWeb(stream) as ReadableStream;
        const filename = attachment.fileName.replace(/"/g, '\\"');
        return new Response(webStream, {
            headers: {
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Type': 'application/octet-stream'
            }
        });
    } catch (err) {
        console.error('[attachment download] stream failed:', err);
        error(500, 'Download failed');
    }
};
