import { Storage } from "@google-cloud/storage";

const bucketName = 'job-camp-attachments';

// Initialize Storage with credentials if GOOGLE_APPLICATION_CREDENTIALS is set (for local dev)
// In production (Cloud Run), this will automatically use the service account
const storage = process.env.GOOGLE_APPLICATION_CREDENTIALS 
  ? new Storage({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    })
  : new Storage();

/**
 * Get a signed URL for a file in the bucket
 * @param storagePath - The GCS storage path (e.g., "Position-Title-filename.pdf")
 * @param expiresInMinutes - URL expiration time in minutes (default: 60)
 * @returns Signed URL that allows secure access to the file
 */
export async function getSignedUrl(storagePath: string, expiresInMinutes: number = 60): Promise<string> {
  const file = storage.bucket(bucketName).file(storagePath);
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + expiresInMinutes * 60 * 1000,
  });
  return url;
}

/**
 * Get a file object from the bucket
 * @param storagePath - The GCS storage path
 * @returns File object
 */
export async function getFile(storagePath: string) {
  return storage.bucket(bucketName).file(storagePath);
}

/**
 * Upload a new file to the bucket
 * @param storagePath - The GCS storage path (e.g., "Position-Title-filename.pdf")
 * @param fileToSave - The file buffer to upload
 */
export async function addNewFile(storagePath: string, fileToSave: Buffer) {
  const file = storage.bucket(bucketName).file(storagePath);
  await file.save(fileToSave);
  // Note: With uniform bucket-level access enabled, files are private by default.
  // Access is controlled via IAM policies at the bucket level, not object-level ACLs.
  // We use signed URLs for secure access, so no need to set object-level permissions.
}

/**
 * Delete a file from the bucket
 * @param storagePath - The GCS storage path
 */
export async function deleteFile(storagePath: string) {
  const file = storage.bucket(bucketName).file(storagePath);
  await file.delete();
}