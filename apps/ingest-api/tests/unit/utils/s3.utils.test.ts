import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

// Default mock env configuration
const mockEnv = {
  leadMagnet: {
    awsRegion: 'eu-west-3',
    awsAccessKeyId: 'test-access-key',
    awsSecretAccessKey: 'test-secret-key',
    s3BucketName: 'test-bucket',
    s3FileKey: 'test-key.pdf',
  },
};

vi.mock('../../../src/config/env.js', () => ({
  env: mockEnv,
}));

describe('S3Utils - getLeadMagnetDownloadUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env to defaults
    mockEnv.leadMagnet.awsAccessKeyId = 'test-access-key';
    mockEnv.leadMagnet.awsSecretAccessKey = 'test-secret-key';
    mockEnv.leadMagnet.s3BucketName = 'test-bucket';
    mockEnv.leadMagnet.s3FileKey = 'test-key.pdf';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate signed URL with correct parameters', async () => {
    // Re-import to get fresh module with mocks
    vi.resetModules();
    const { getLeadMagnetDownloadUrl } = await import('../../../src/utils/s3.utils.js');
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
    vi.resetModules();
    const { getLeadMagnetDownloadUrl } = await import('../../../src/utils/s3.utils.js');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const awsError = new Error('AWS SDK Error: Network timeout');
    
    (getSignedUrl as any).mockRejectedValue(awsError);

    await expect(getLeadMagnetDownloadUrl()).rejects.toThrow('AWS SDK Error: Network timeout');
  });

  it('should use correct expiration time (900 seconds / 15 minutes)', async () => {
    vi.resetModules();
    const { getLeadMagnetDownloadUrl } = await import('../../../src/utils/s3.utils.js');
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

  it('should throw error if AWS_ACCESS_KEY_ID is missing', async () => {
    mockEnv.leadMagnet.awsAccessKeyId = '';
    vi.resetModules();
    const { getLeadMagnetDownloadUrl } = await import('../../../src/utils/s3.utils.js');

    await expect(getLeadMagnetDownloadUrl()).rejects.toThrow('S3 configuration missing: AWS credentials not set');
  });

  it('should throw error if AWS_SECRET_ACCESS_KEY is missing', async () => {
    mockEnv.leadMagnet.awsSecretAccessKey = '';
    vi.resetModules();
    const { getLeadMagnetDownloadUrl } = await import('../../../src/utils/s3.utils.js');

    await expect(getLeadMagnetDownloadUrl()).rejects.toThrow('S3 configuration missing: AWS credentials not set');
  });

  it('should throw error if S3_BUCKET_NAME is missing', async () => {
    mockEnv.leadMagnet.s3BucketName = '';
    vi.resetModules();
    const { getLeadMagnetDownloadUrl } = await import('../../../src/utils/s3.utils.js');

    await expect(getLeadMagnetDownloadUrl()).rejects.toThrow('S3 configuration missing: S3_BUCKET_NAME not set');
  });

  it('should throw error if S3_FILE_KEY is missing', async () => {
    mockEnv.leadMagnet.s3FileKey = '';
    vi.resetModules();
    const { getLeadMagnetDownloadUrl } = await import('../../../src/utils/s3.utils.js');

    await expect(getLeadMagnetDownloadUrl()).rejects.toThrow('S3 configuration missing: S3_FILE_KEY not set');
  });
});
