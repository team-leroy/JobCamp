import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma.js';

export async function GET({ params }) {
    const { jobId } = params;
    
    try {
        const job = await prisma.lotteryJob.findUnique({
            where: { id: jobId }
        });
        
        if (!job) {
            return json({ error: 'Job not found' }, { status: 404 });
        }
        
        return json({
            status: job.status,
            progress: job.progress,
            currentSeed: job.currentSeed,
            error: job.error
        });
    } catch {
        return json({ error: 'Failed to fetch job status' }, { status: 500 });
    }
} 