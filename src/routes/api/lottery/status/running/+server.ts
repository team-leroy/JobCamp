import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma.js';

export async function GET() {
    try {
        const runningJob = await prisma.lotteryJob.findFirst({
            where: { status: 'RUNNING' }
        });
        
        if (!runningJob) {
            return json({ jobId: null });
        }
        
        return json({
            jobId: runningJob.id,
            status: runningJob.status,
            progress: runningJob.progress,
            currentSeed: runningJob.currentSeed
        });
    } catch {
        return json({ error: 'Failed to find running job' }, { status: 500 });
    }
} 