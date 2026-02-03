import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createChildLogger } from './logger.js';
import { env } from '../config/env.js';

const logger = createChildLogger('S3Utils');

/**
 * Initialize S3 client with credentials from environment
 */
const s3Client = new S3Client({
  region: env.leadMagnet.awsRegion,
  credentials: {
    accessKeyId: env.leadMagnet.awsAccessKeyId!,
    secretAccessKey: env.leadMagnet.awsSecretAccessKey!,
  },
});

/**
 * Generate a time-limited signed URL for lead magnet PDF download
 * @returns Promise<string> - Signed S3 URL valid for 15 minutes
 * @throws Error if S3 credentials missing or S3 request fails
 */
export async function getLeadMagnetDownloadUrl(): Promise<string> {
  const bucketName = env.leadMagnet.s3BucketName;
  const fileKey = env.leadMagnet.s3FileKey;

  if (!bucketName) {
    logger.error('S3_BUCKET_NAME environment variable not set');
    throw new Error('S3 configuration missing: S3_BUCKET_NAME not set');
  }

  if (!fileKey) {
    logger.error('S3_FILE_KEY environment variable not set');
    throw new Error('S3 configuration missing: S3_FILE_KEY not set');
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
    ResponseContentDisposition: 'attachment; filename="guide-mariee-sereine.pdf"',
    ResponseContentType: 'application/pdf',
  });

  try {
    // Signed URL valid for 15 minutes (900 seconds)
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    logger.debug({ bucket: bucketName, key: fileKey }, 'Generated S3 signed URL');
    return signedUrl;
  } catch (error) {
    logger.error({ error, bucket: bucketName, key: fileKey }, 'Failed to generate S3 signed URL');
    throw error;
  }
}
