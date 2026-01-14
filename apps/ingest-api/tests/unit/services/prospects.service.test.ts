// tests/unit/services/prospects.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProspectsService } from '../../../src/services/prospects.service.js';
import { prospectsRepository } from '../../../src/repositories/prospects.repository.js';

// Mock du repository
vi.mock('../../../src/repositories/prospects.repository.js', () => ({
  prospectsRepository: {
    findCampaignByIdAndOrg: vi.fn(),
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
});
