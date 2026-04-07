import { createReadStream, mkdirSync } from 'node:fs';
import { writeFile, unlink, access } from 'node:fs/promises';
import { join } from 'node:path';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? '/app/uploads';
try {
    mkdirSync(UPLOAD_DIR, { recursive: true });
} catch {
    console.warn(`[storage] Warning: UPLOAD_DIR "${UPLOAD_DIR}" could not be created. File uploads will fail.`);
}

/**
 * Upload a new file to local storage
 * @param storagePath - Filename (e.g., "Position-Title-timestamp-filename.pdf")
 * @param fileToSave - The file buffer to write
 */
export async function addNewFile(storagePath: string, fileToSave: Buffer) {
    await writeFile(join(UPLOAD_DIR, storagePath), fileToSave);
}

/**
 * Delete a file from local storage
 * @param storagePath - Filename to delete
 */
export async function deleteFile(storagePath: string) {
    await unlink(join(UPLOAD_DIR, storagePath));
}

/**
 * Get a local file adapter with the same interface used by the download endpoint
 * @param storagePath - Filename to reference
 */
export function getFile(storagePath: string) {
    const filePath = join(UPLOAD_DIR, storagePath);
    return {
        exists: async (): Promise<[boolean]> => {
            try {
                await access(filePath);
                return [true];
            } catch {
                return [false];
            }
        },
        createReadStream: () => createReadStream(filePath)
    };
}
