/**
 * One-time migration script: download all attachments from GCS to local storage.
 *
 * Usage:
 *   DATABASE_URL="<db-url>" \
 *   UPLOAD_DIR="/path/to/uploads" \
 *   GOOGLE_APPLICATION_CREDENTIALS="./keyfile.json" \
 *   pnpm tsx scripts/migrate-gcs-to-local.ts
 *
 * Safe to re-run — skips files that already exist locally.
 */

import { Storage } from '@google-cloud/storage';
import { prisma } from '../src/lib/server/prisma';
import { existsSync, mkdirSync, createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';

const BUCKET_NAME = 'job-camp-attachments';
const UPLOAD_DIR = process.env.UPLOAD_DIR;

if (!UPLOAD_DIR) {
    console.error('ERROR: UPLOAD_DIR environment variable is required.');
    process.exit(1);
}

if (!existsSync(UPLOAD_DIR)) {
    console.log(`Creating upload directory: ${UPLOAD_DIR}`);
    mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? new Storage({ keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS })
    : new Storage();

const bucket = storage.bucket(BUCKET_NAME);

async function main() {
    const attachments = await prisma.attachment.findMany({
        select: { id: true, storagePath: true, fileName: true }
    });

    console.log(`Found ${attachments.length} attachment(s) in database.\n`);

    let succeeded = 0;
    let skipped = 0;
    let failed = 0;

    for (const attachment of attachments) {
        const localPath = join(UPLOAD_DIR!, attachment.storagePath);

        if (existsSync(localPath)) {
            console.log(`  SKIP  ${attachment.storagePath} (already exists locally)`);
            skipped++;
            continue;
        }

        try {
            const file = bucket.file(attachment.storagePath);
            const [exists] = await file.exists();
            if (!exists) {
                console.error(`  MISS  ${attachment.storagePath} (not found in GCS)`);
                failed++;
                continue;
            }

            const readStream = file.createReadStream();
            const writeStream = createWriteStream(localPath);
            await pipeline(readStream, writeStream);

            console.log(`    OK  ${attachment.storagePath}`);
            succeeded++;
        } catch (err) {
            console.error(`  FAIL  ${attachment.storagePath}:`, err);
            failed++;
        }
    }

    console.log(`
──────────────────────────────
Migration complete
  Total:     ${attachments.length}
  Succeeded: ${succeeded}
  Skipped:   ${skipped}
  Failed:    ${failed}
──────────────────────────────`);

    await prisma.$disconnect();

    if (failed > 0) {
        process.exit(1);
    }
}

main().catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
