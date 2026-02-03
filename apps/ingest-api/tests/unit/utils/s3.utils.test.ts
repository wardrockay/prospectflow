import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getLeadMagnetDownloadUrl } from '../../../src/utils/s3.utils.js';

// Mock AWS SDK modules
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({})),
  GetObjectCommand: vi.fn().mockImplementation((params) => params),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}));

// Mock logger
vi.mock('../../../src/utils/logger.js', () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

// Mock env configuration
vi.mock('../../../src/config/env.js', () => ({
  env: {
    leadMagnet: {
      awsRegion: 'eu-west-3',
      awsAccessKeyId: 'test-access-key',
      awsSecretAccessKey: 'test-secret-key',
      s3BucketName: 'test-bucket',
      s3FileKey: 'test-key.pdf',
    },
  },
}));

describe('S3Utils - getLeadMagnetDownloadUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate signed URL with correct parameters', async () => {
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const mockSignedUrl = 'https://s3.eu-west-3.amazonaws.com/test-bucket/test-key.pdf?signature=xyz';
    
    (getSignedUrl as any).mockResolvedValue(mockSignedUrl);

    const url = await getLeadMagnetDownloadUrl();

    expect(url).toBe(mockSignedUrl);
    expect(getSignedUrl).toHaveBeenCalledTimes(1);
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(), // S3Client instance
      expect.objectContaining({
        Bucket: 'test-bucket',
        Key: 'test-key.pdf',
        ResponseContentDisposition: 'attachment; filename="guide-mariee-sereine.pdf"',
        ResponseContentType: 'application/pdf',
      }),
      { expiresIn: 900 }
    );
  });

  it('should propagate AWS SDK errors', async () => {
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const awsError = new Error('AWS SDK Error: Network timeout');
    
    (getSignedUrl as any).mockRejectedValue(awsError);

    await expect(getLeadMagnetDownloadUrl()).rejects.toThrow('AWS SDK Error: Network timeout');
  });

  it('should use correct expiration time (900 seconds / 15 minutes)', async () => {
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const mockSignedUrl = 'https://s3.eu-west-3.amazonaws.com/test-bucket/test-key.pdf?signature=xyz';
    
    (getSignedUrl as any).mockResolvedValue(mockSignedUrl);

    await getLeadMagnetDownloadUrl();

    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { expiresIn: 900 } // 15 minutes
    );
  });
});
