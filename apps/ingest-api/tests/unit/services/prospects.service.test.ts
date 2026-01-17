// tests/unit/services/prospects.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProspectsService } from '../../../src/services/prospects.service.js';
import { prospectsRepository } from '../../../src/repositories/prospects.repository.js';

// Mock du repository
vi.mock('../../../src/repositories/prospects.repository.js', () => ({
  prospectsRepository: {
    findCampaignByIdAndOrg: vi.fn(),
    createUpload: vi.fn(),
    findUploadByIdAndOrg: vi.fn(),
    updateUploadColumns: vi.fn(),
    updateUploadColumnMappings: vi.fn(),
  },
}));

describe('ProspectsService', () => {
  let prospectsService: ProspectsService;

  beforeEach(() => {
    prospectsService = new ProspectsService();
    vi.clearAllMocks();
  });

  describe('handleUpload', () => {
    it('should process valid CSV file and return upload metadata', async () => {
      // Arrange
      const campaignId = 'campaign-123';
      const organisationId = 'org-123';
      const mockFile = {
        originalname: 'prospects.csv',
        size: 2048,
        buffer: Buffer.from('company_name,contact_email\nAcme Corp,test@acme.com'),
        mimetype: 'text/csv',
      } as Express.Multer.File;

      vi.mocked(prospectsRepository.findCampaignByIdAndOrg).mockResolvedValue({
        id: campaignId,
        name: 'Test Campaign',
        organisationId,
      } as any);

      vi.mocked(prospectsRepository.createUpload).mockResolvedValue({
        uploadId: 'upload-123',
        uploadedAt: new Date(),
      } as any);

      // Act
      const result = await prospectsService.handleUpload(campaignId, organisationId, mockFile);

      // Assert
      expect(result).toHaveProperty('uploadId');
      expect(result.filename).toBe('prospects.csv');
      expect(result.fileSize).toBe(2048);
      expect(result.rowCount).toBeGreaterThan(0);
      expect(result.uploadedAt).toBeDefined();
    });

    it('should throw 404 AppError when campaign not found', async () => {
      // Arrange
      const campaignId = 'nonexistent-campaign';
      const organisationId = 'org-123';
      const mockFile = {
        originalname: 'prospects.csv',
        size: 1024,
        buffer: Buffer.from('company_name,contact_email\nAcme,test@acme.com'),
      } as Express.Multer.File;

      vi.mocked(prospectsRepository.findCampaignByIdAndOrg).mockResolvedValue(null);

      // Act & Assert
      try {
        await prospectsService.handleUpload(campaignId, organisationId, mockFile);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Campaign not found');
        expect(error.statusCode).toBe(404);
      }
    });

    it('should count CSV rows correctly', async () => {
      // Arrange
      const mockFile = {
        originalname: 'prospects.csv',
        size: 1024,
        buffer: Buffer.from(
          'company_name,contact_email\nAcme,test@acme.com\nGlobex,admin@globex.com\nInitech,hr@initech.com',
        ),
      } as Express.Multer.File;

      vi.mocked(prospectsRepository.findCampaignByIdAndOrg).mockResolvedValue({
        id: 'campaign-123',
        organisationId: 'org-123',
      } as any);

      vi.mocked(prospectsRepository.createUpload).mockResolvedValue({
        uploadId: 'upload-123',
        uploadedAt: new Date(),
      } as any);

      // Act
      const result = await prospectsService.handleUpload('campaign-123', 'org-123', mockFile);

      // Assert
      expect(result.rowCount).toBe(3); // 3 data rows (excluding header)
    });
  });

  describe('generateTemplate', () => {
    it('should generate CSV template with correct format', async () => {
      // Act
      const template = await prospectsService.generateTemplate();

      // Assert
      expect(template).toContain('company_name,contact_email,contact_name,website_url');
      expect(template).toContain('Acme Corp,sarah@acmecorp.com,Sarah Johnson,https://acmecorp.com');
      const lines = template.split('\n');
      expect(lines.length).toBe(2); // Header + 1 example row
    });
  });

  describe('validateData', () => {
    it('should validate prospect data and return results', async () => {
      const uploadId = 'upload-123';
      const organisationId = 'org-123';
      const csvData = 'company_name,contact_email\nAcme Corp,test@acme.com\n,invalid@example.com';
      
      vi.mocked(prospectsRepository.findUploadByIdAndOrg).mockResolvedValue({
        uploadId,
        organisationId,
        fileBuffer: Buffer.from(csvData),
        columnMappings: {
          company_name: 'company_name',
          contact_email: 'contact_email',
        },
      } as any);

      const result = await prospectsService.validateData(uploadId, organisationId);

      expect(result).toHaveProperty('validCount');
      expect(result).toHaveProperty('invalidCount');
      expect(result).toHaveProperty('errors');
      expect(result.validCount).toBeGreaterThanOrEqual(0);
      expect(result.invalidCount).toBeGreaterThanOrEqual(0);
    });

    it('should throw error if upload not found', async () => {
      vi.mocked(prospectsRepository.findUploadByIdAndOrg).mockResolvedValue(null);

      await expect(
        prospectsService.validateData('invalid-id', 'org-123')
      ).rejects.toThrow('Upload not found');
    });

    it('should throw error if column mappings not set', async () => {
      vi.mocked(prospectsRepository.findUploadByIdAndOrg).mockResolvedValue({
        uploadId: 'upload-123',
        fileBuffer: Buffer.from('test'),
        columnMappings: null,
      } as any);

      await expect(
        prospectsService.validateData('upload-123', 'org-123')
      ).rejects.toThrow('Column mappings must be set');
    });
  });
});
