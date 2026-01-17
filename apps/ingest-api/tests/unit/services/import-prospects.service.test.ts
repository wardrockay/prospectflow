/**
 * Unit tests for ImportProspectsService
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportProspectsService } from '../../../src/services/import-prospects.service.js';
import { ProspectRepository } from '../../../src/repositories/prospect.repository.js';
import type { ValidationResult } from '../../../src/types/index.js';

// Mock the logger
vi.mock('../../../src/utils/logger', () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('ImportProspectsService', () => {
  let importService: ImportProspectsService;
  let mockRepository: ProspectRepository;

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      batchInsertProspects: vi.fn(),
    } as any;

    importService = new ImportProspectsService(mockRepository);
  });

  describe('importValidProspects', () => {
    it('should import valid prospects successfully', async () => {
      // Arrange
      const validationResult: ValidationResult = {
        validCount: 2,
        invalidCount: 0,
        totalErrorCount: 0,
        warningCount: 0,
        duplicateCount: 0,
        campaignDuplicateCount: 0,
        organizationDuplicateCount: 0,
        errors: [],
        warnings: [],
        validRows: [
          {
            company_name: 'Acme Corp',
            contact_email: 'john@acme.com',
            contact_name: 'John Doe',
            website_url: 'https://acme.com',
          },
          {
            company_name: 'Beta Inc',
            contact_email: 'jane@beta.com',
            contact_name: 'Jane Smith',
            website_url: 'https://beta.com',
          },
        ],
        invalidRows: [],
        validProspects: [
          {
            company_name: 'Acme Corp',
            contact_email: 'john@acme.com',
            contact_name: 'John Doe',
            website_url: 'https://acme.com',
          },
          {
            company_name: 'Beta Inc',
            contact_email: 'jane@beta.com',
            contact_name: 'Jane Smith',
            website_url: 'https://beta.com',
          },
        ],
      };

      const campaignId = 'campaign-123';
      const organisationId = 'org-456';

      vi.mocked(mockRepository.batchInsertProspects).mockResolvedValue([
        { id: 'prospect-1', contactEmail: 'john@acme.com' },
        { id: 'prospect-2', contactEmail: 'jane@beta.com' },
      ]);

      // Act
      const result = await importService.importValidProspects(
        validationResult,
        campaignId,
        organisationId,
      );

      // Assert
      expect(mockRepository.batchInsertProspects).toHaveBeenCalledWith(
        validationResult.validProspects,
        campaignId,
        organisationId,
      );
      expect(result).toEqual({
        imported: 2,
        failed: 0,
        prospectIds: ['prospect-1', 'prospect-2'],
      });
    });

    it('should return empty result when no valid prospects', async () => {
      // Arrange
      const validationResult: ValidationResult = {
        validCount: 0,
        invalidCount: 2,
        totalErrorCount: 2,
        warningCount: 0,
        duplicateCount: 0,
        campaignDuplicateCount: 0,
        organizationDuplicateCount: 0,
        errors: [
          {
            rowNumber: 1,
            field: 'contact_email',
            errorType: 'INVALID_EMAIL_FORMAT',
            message: 'Invalid email',
            originalValue: 'invalid',
          },
        ],
        warnings: [],
        validRows: [],
        invalidRows: [{ company_name: 'Test', contact_email: 'invalid' }],
        validProspects: [],
      };

      const campaignId = 'campaign-123';
      const organisationId = 'org-456';

      // Act
      const result = await importService.importValidProspects(
        validationResult,
        campaignId,
        organisationId,
      );

      // Assert
      expect(mockRepository.batchInsertProspects).not.toHaveBeenCalled();
      expect(result).toEqual({
        imported: 0,
        failed: 0,
        prospectIds: [],
      });
    });

    it('should filter out rows with errors', async () => {
      // Arrange
      const validationResult: ValidationResult = {
        validCount: 1,
        invalidCount: 1,
        totalErrorCount: 1,
        warningCount: 0,
        duplicateCount: 0,
        campaignDuplicateCount: 0,
        organizationDuplicateCount: 0,
        errors: [
          {
            rowNumber: 2,
            field: 'contact_email',
            errorType: 'INVALID_EMAIL_FORMAT',
            message: 'Invalid email',
            originalValue: 'invalid',
          },
        ],
        warnings: [],
        validRows: [
          { company_name: 'Acme', contact_email: 'john@acme.com' },
          { company_name: 'Beta', contact_email: 'invalid' },
        ],
        invalidRows: [{ company_name: 'Beta', contact_email: 'invalid' }],
        validProspects: [
          {
            company_name: 'Acme',
            contact_email: 'john@acme.com',
          },
          {
            company_name: 'Beta',
            contact_email: 'invalid',
          },
        ],
      };

      const campaignId = 'campaign-123';
      const organisationId = 'org-456';

      vi.mocked(mockRepository.batchInsertProspects).mockResolvedValue([
        { id: 'prospect-1', contactEmail: 'john@acme.com' },
      ]);

      // Act
      const result = await importService.importValidProspects(
        validationResult,
        campaignId,
        organisationId,
      );

      // Assert
      expect(mockRepository.batchInsertProspects).toHaveBeenCalledWith(
        [{ company_name: 'Acme', contact_email: 'john@acme.com' }],
        campaignId,
        organisationId,
      );
      expect(result.imported).toBe(1);
    });

    it('should propagate repository errors', async () => {
      // Arrange
      const validationResult: ValidationResult = {
        validCount: 1,
        invalidCount: 0,
        totalErrorCount: 0,
        warningCount: 0,
        duplicateCount: 0,
        campaignDuplicateCount: 0,
        organizationDuplicateCount: 0,
        errors: [],
        warnings: [],
        validRows: [{ company_name: 'Acme', contact_email: 'john@acme.com' }],
        invalidRows: [],
        validProspects: [
          {
            company_name: 'Acme',
            contact_email: 'john@acme.com',
          },
        ],
      };

      const campaignId = 'campaign-123';
      const organisationId = 'org-456';

      const error = new Error('Database error');
      vi.mocked(mockRepository.batchInsertProspects).mockRejectedValue(error);

      // Act & Assert
      await expect(
        importService.importValidProspects(validationResult, campaignId, organisationId),
      ).rejects.toThrow('Database error');
    });
  });
});
