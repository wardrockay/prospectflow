/**
 * Data Validator Service Tests
 * Tests field-level data validation for prospect imports
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataValidatorService } from '../../../src/services/data-validator.service.js';
import type { ExistingProspect } from '../../../src/repositories/prospects.repository.js';

// Mock logger
vi.mock('../../../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  createChildLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

// Mock prospects repository - use vi.hoisted for proper hoisting
const { mockFindExistingProspectsByEmails } = vi.hoisted(() => ({
  mockFindExistingProspectsByEmails: vi.fn(),
}));

vi.mock('../../../src/repositories/prospects.repository.js', () => ({
  prospectsRepository: {
    findExistingProspectsByEmails: mockFindExistingProspectsByEmails,
  },
}));

describe('DataValidatorService', () => {
  let service: DataValidatorService;

  beforeEach(() => {
    service = new DataValidatorService();
    // Clear all mocks before each test
    vi.clearAllMocks();
    // Default mock return value (no existing prospects)
    mockFindExistingProspectsByEmails.mockResolvedValue([]);
  });

  describe('Company Name Validation (AC2)', () => {
    it('should accept valid company names', async () => {
      const rows = [
        { company_name: 'Acme Corp', contact_email: 'test@example.com' },
        { company_name: 'ABC123 Industries', contact_email: 'test@example.com' },
        { company_name: 'Company & Partners', contact_email: 'test@example.com' },
      ];

      const result = await service.validateData(rows, 'org-123');

      expect(result.validCount).toBe(3);
      expect(result.invalidCount).toBe(0);
    });

    it('should trim whitespace from company names', async () => {
      const rows = [{ company_name: '  Acme Corp  ', contact_email: 'test@example.com' }];

      const result = await service.validateData(rows, 'org-123');

      expect(result.validCount).toBe(1);
      expect(result.validRows[0].company_name).toBe('Acme Corp');
    });

    it('should reject empty or whitespace-only company names', async () => {
      const rows = [
        { company_name: '', contact_email: 'test@example.com' },
        { company_name: '   ', contact_email: 'test2@example.com' },
      ];

      const result = await service.validateData(rows, 'org-123');

      expect(result.invalidCount).toBe(2);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'company_name',
            errorType: 'COMPANY_NAME_REQUIRED',
          }),
        ]),
      );
    });

    it('should reject company names without alphabetic characters', async () => {
      const rows = [
        { company_name: '123', contact_email: 'test@example.com' },
        { company_name: '@#$%', contact_email: 'test2@example.com' },
      ];

      const result = await service.validateData(rows, 'org-123');

      expect(result.invalidCount).toBe(2);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'company_name',
            errorType: 'COMPANY_NAME_INVALID',
            message: expect.stringContaining('letter'),
          }),
        ]),
      );
    });

    it('should reject company names exceeding 200 characters', async () => {
      const longName = 'A'.repeat(201);
      const rows = [{ company_name: longName, contact_email: 'test@example.com' }];

      const result = await service.validateData(rows, 'org-123');

      expect(result.invalidCount).toBe(1);
      expect(result.errors[0]).toMatchObject({
        field: 'company_name',
        errorType: 'COMPANY_NAME_TOO_LONG',
      });
    });
  });

  describe('Email Format Validation (AC1)', () => {
    it('should accept valid email formats', async () => {
      const rows = [
        { company_name: 'Acme', contact_email: 'sarah@acmecorp.com' },
        { company_name: 'Acme', contact_email: 'sarah.johnson@acme-corp.co.uk' },
        { company_name: 'Acme', contact_email: 'user+tag@example.com' },
      ];

      const result = await service.validateData(rows, 'org-123');

      expect(result.validCount).toBe(3);
      expect(result.invalidCount).toBe(0);
    });

    it('should reject invalid email formats', async () => {
      const rows = [
        { company_name: 'Acme', contact_email: 'invalid.email' },
        { company_name: 'Acme', contact_email: '@example.com' },
        { company_name: 'Acme', contact_email: 'user@' },
        { company_name: 'Acme', contact_email: 'user @example.com' },
      ];

      const result = await service.validateData(rows, 'org-123');

      expect(result.invalidCount).toBe(4);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'contact_email',
            errorType: 'INVALID_EMAIL_FORMAT',
          }),
        ]),
      );
    });
  });

  describe('Website URL Validation (AC3)', () => {
    it('should normalize URLs by adding https:// prefix', async () => {
      const rows = [
        { company_name: 'Acme', contact_email: 'test@example.com', website_url: 'acmecorp.com' },
      ];

      const result = await service.validateData(rows, 'org-123');

      expect(result.validCount).toBe(1);
      expect(result.validRows[0].website_url).toBe('https://acmecorp.com');
    });

    it('should normalize URLs by removing trailing slash', async () => {
      const rows = [
        {
          company_name: 'Acme',
          contact_email: 'test@example.com',
          website_url: 'https://acmecorp.com/',
        },
      ];

      const result = await service.validateData(rows, 'org-123');

      expect(result.validCount).toBe(1);
      expect(result.validRows[0].website_url).toBe('https://acmecorp.com');
    });

    it('should reject invalid URL formats', async () => {
      const rows = [
        { company_name: 'Acme', contact_email: 'test@example.com', website_url: 'not a url' },
        {
          company_name: 'Acme',
          contact_email: 'test2@example.com',
          website_url: 'ftp://example.com',
        },
      ];

      const result = await service.validateData(rows, 'org-123');

      expect(result.invalidCount).toBe(2);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'website_url',
            errorType: 'INVALID_URL_FORMAT',
          }),
        ]),
      );
    });

    it('should allow empty website URLs (optional field)', async () => {
      const rows = [
        { company_name: 'Acme', contact_email: 'test@example.com', website_url: '' },
        { company_name: 'Acme', contact_email: 'test2@example.com' }, // missing field
      ];

      const result = await service.validateData(rows, 'org-123');

      expect(result.validCount).toBe(2);
    });
  });

  describe('Contact Name Validation (AC4)', () => {
    it('should accept valid contact names', async () => {
      const rows = [
        { company_name: 'Acme', contact_email: 'test@example.com', contact_name: 'John Doe' },
        { company_name: 'Acme', contact_email: 'test2@example.com', contact_name: 'Jane' },
      ];

      const result = await service.validateData(rows, 'org-123');

      expect(result.validCount).toBe(2);
    });

    it('should trim whitespace from contact names', async () => {
      const rows = [
        { company_name: 'Acme', contact_email: 'test@example.com', contact_name: '  John Doe  ' },
      ];

      const result = await service.validateData(rows, 'org-123');

      expect(result.validCount).toBe(1);
      expect(result.validRows[0].contact_name).toBe('John Doe');
    });

    it('should allow empty contact names (optional field)', async () => {
      const rows = [
        { company_name: 'Acme', contact_email: 'test@example.com', contact_name: '' },
        { company_name: 'Acme', contact_email: 'test2@example.com' }, // missing field
      ];

      const result = await service.validateData(rows, 'org-123');

      expect(result.validCount).toBe(2);
    });

    it('should reject contact names exceeding 100 characters', async () => {
      const longName = 'A'.repeat(101);
      const rows = [
        { company_name: 'Acme', contact_email: 'test@example.com', contact_name: longName },
      ];

      const result = await service.validateData(rows, 'org-123');

      expect(result.invalidCount).toBe(1);
      expect(result.errors[0]).toMatchObject({
        field: 'contact_name',
        errorType: 'CONTACT_NAME_TOO_LONG',
      });
    });
  });

  describe('Validation Error Reporting (AC5)', () => {
    it('should capture row number, field, error type, message, and original value', async () => {
      const rows = [
        { company_name: 'Acme', contact_email: 'invalid' }, // Row 1 (0-indexed)
      ];

      const result = await service.validateData(rows, 'org-123');

      expect(result.errors[0]).toMatchObject({
        rowNumber: 1,
        field: 'contact_email',
        errorType: 'INVALID_EMAIL_FORMAT',
        message: expect.any(String),
        originalValue: 'invalid',
      });
    });

    it('should report multiple errors for the same row', async () => {
      const rows = [
        { company_name: '', contact_email: 'invalid' }, // Two errors (company + email)
      ];

      const result = await service.validateData(rows, 'org-123');

      expect(result.invalidCount).toBe(1);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      // At least 2 errors for row 1 (could be more depending on Zod parsing)
      expect(result.errors.filter((e) => e.rowNumber === 1).length).toBeGreaterThanOrEqual(2);
    });

    it('should create summary with valid and invalid counts', async () => {
      const rows = [
        { company_name: 'Acme', contact_email: 'valid@example.com' }, // Valid
        { company_name: '', contact_email: 'invalid' }, // Invalid
        { company_name: 'Acme Corp', contact_email: 'test@example.com' }, // Valid
      ];

      const result = await service.validateData(rows, 'org-123');

      expect(result.validCount).toBe(2);
      expect(result.invalidCount).toBe(1);
      expect(result.validRows).toHaveLength(2);
      expect(result.invalidRows).toHaveLength(1);
    });

    it('should limit errors to 100 in response', async () => {
      const rows = Array.from({ length: 200 }, () => ({
        company_name: 'Acme',
        contact_email: 'invalid',
      }));

      const result = await service.validateData(rows, 'org-123');

      expect(result.errors.length).toBeLessThanOrEqual(100);
      expect(result.totalErrorCount).toBeGreaterThan(100);
    });
  });

  describe('Performance Requirements', () => {
    it('should validate 100 rows in less than 5 seconds', async () => {
      const rows = Array.from({ length: 100 }, (_, i) => ({
        company_name: `Company ${i}`,
        contact_email: `test${i}@example.com`,
        website_url: `company${i}.com`,
        contact_name: `Person ${i}`,
      }));

      const startTime = Date.now();
      await service.validateData(rows, 'org-123');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Duplicate Detection (Story 2.4)', () => {
    describe('AC1: Duplicate Email Detection', () => {
      it('should detect duplicate emails and flag all except first occurrence', async () => {
        const rows = [
          { company_name: 'Acme Corp', contact_email: 'john@acme.com' },
          { company_name: 'Beta Inc', contact_email: 'sarah@beta.com' },
          { company_name: 'Acme Duplicate', contact_email: 'john@acme.com' }, // Duplicate
        ];

        const result = await service.validateData(rows, 'org-123');

        expect(result.duplicateCount).toBe(1);
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            rowNumber: 3,
            field: 'contact_email',
            errorType: 'DUPLICATE_EMAIL',
            message: expect.stringContaining('First occurrence at row 1'),
            originalValue: 'john@acme.com',
            metadata: expect.objectContaining({
              firstOccurrenceRow: 1,
              duplicateOf: 'john@acme.com',
            }),
          }),
        );
      });

      it('should include duplicate count in validation result', async () => {
        const rows = [
          { company_name: 'A', contact_email: 'test@example.com' },
          { company_name: 'B', contact_email: 'test@example.com' },
          { company_name: 'C', contact_email: 'other@example.com' },
        ];

        const result = await service.validateData(rows, 'org-123');

        expect(result.duplicateCount).toBe(1);
        expect(result.totalErrorCount).toBeGreaterThanOrEqual(1);
      });
    });

    describe('AC2: Case-Insensitive Matching', () => {
      it('should detect duplicates regardless of case', async () => {
        const rows = [
          { company_name: 'Acme Corp', contact_email: 'John@Acme.com' },
          { company_name: 'Acme Corp 2', contact_email: 'john@acme.com' }, // Duplicate (different case)
        ];

        const result = await service.validateData(rows, 'org-123');

        expect(result.duplicateCount).toBe(1);
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            rowNumber: 2,
            errorType: 'DUPLICATE_EMAIL',
            metadata: expect.objectContaining({
              duplicateOf: 'john@acme.com', // normalized
            }),
          }),
        );
      });

      it('should normalize emails before comparison', async () => {
        const rows = [
          { company_name: 'A', contact_email: 'Sarah@Example.COM' },
          { company_name: 'B', contact_email: 'SARAH@EXAMPLE.COM' },
          { company_name: 'C', contact_email: 'sarah@example.com' },
        ];

        const result = await service.validateData(rows, 'org-123');

        expect(result.duplicateCount).toBe(2); // 2nd and 3rd are duplicates
      });
    });

    describe('Multiple Duplicates', () => {
      it('should detect multiple duplicates of the same email', async () => {
        const rows = [
          { company_name: 'A', contact_email: 'test@example.com' },
          { company_name: 'B', contact_email: 'test@example.com' }, // Duplicate 1
          { company_name: 'C', contact_email: 'test@example.com' }, // Duplicate 2
          { company_name: 'D', contact_email: 'other@example.com' },
        ];

        const result = await service.validateData(rows, 'org-123');

        expect(result.duplicateCount).toBe(2);
        const duplicateErrors = result.errors.filter((e) => e.errorType === 'DUPLICATE_EMAIL');
        expect(duplicateErrors).toHaveLength(2);

        // Both duplicates should reference row 1 as first occurrence
        expect(duplicateErrors[0].metadata?.firstOccurrenceRow).toBe(1);
        expect(duplicateErrors[1].metadata?.firstOccurrenceRow).toBe(1);
      });

      it('should detect duplicates across multiple different emails', async () => {
        const rows = [
          { company_name: 'A', contact_email: 'john@acme.com' },
          { company_name: 'B', contact_email: 'sarah@beta.com' },
          { company_name: 'C', contact_email: 'john@acme.com' }, // Duplicate of row 1
          { company_name: 'D', contact_email: 'sarah@beta.com' }, // Duplicate of row 2
        ];

        const result = await service.validateData(rows, 'org-123');

        expect(result.duplicateCount).toBe(2);
      });
    });

    describe('Edge Cases', () => {
      it('should handle whitespace in emails before duplicate detection', async () => {
        const rows = [
          { company_name: 'A', contact_email: '  john@acme.com  ' },
          { company_name: 'B', contact_email: 'john@acme.com' }, // Duplicate after trim
        ];

        const result = await service.validateData(rows, 'org-123');

        expect(result.duplicateCount).toBe(1);
      });

      it('should skip rows with missing emails in duplicate detection', async () => {
        const rows = [
          { company_name: 'A', contact_email: '' },
          { company_name: 'B', contact_email: '' },
          { company_name: 'C', contact_email: 'valid@example.com' },
        ];

        const result = await service.validateData(rows, 'org-123');

        // Empty emails should not be counted as duplicates
        expect(result.duplicateCount).toBe(0);
      });

      it('should handle dataset with no duplicates', async () => {
        const rows = [
          { company_name: 'A', contact_email: 'john@acme.com' },
          { company_name: 'B', contact_email: 'sarah@beta.com' },
          { company_name: 'C', contact_email: 'mike@gamma.com' },
        ];

        const result = await service.validateData(rows, 'org-123');

        expect(result.duplicateCount).toBe(0);
      });
    });

    describe('AC4: Performance', () => {
      it('should complete duplicate detection for 1000 rows in < 2 seconds', async () => {
        const rows = Array.from({ length: 1000 }, (_, i) => ({
          company_name: `Company ${i}`,
          contact_email: `user${i}@example.com`,
        }));

        const startTime = Date.now();
        const result = await service.validateData(rows, 'org-123');
        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(2000);
        expect(result.duplicateCount).toBe(0);
      });

      it('should detect duplicates efficiently in large dataset', async () => {
        // Create 1000 rows where every 10th row is a duplicate
        const rows = Array.from({ length: 1000 }, (_, i) => ({
          company_name: `Company ${i}`,
          contact_email: i % 10 === 0 ? 'duplicate@example.com' : `user${i}@example.com`,
        }));

        const startTime = Date.now();
        const result = await service.validateData(rows, 'org-123');
        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(2000);
        expect(result.duplicateCount).toBe(99); // 100 occurrences, first is not duplicate
        expect(result.errors.filter((e) => e.errorType === 'DUPLICATE_EMAIL').length).toBeGreaterThan(0);
      });
    });

    describe('Integration with Field Validation', () => {
      it('should detect duplicates even when rows have other validation errors', async () => {
        const rows = [
          { company_name: 'Acme', contact_email: 'invalid-email' }, // Invalid format
          { company_name: 'Beta', contact_email: 'invalid-email' }, // Duplicate + invalid
        ];

        const result = await service.validateData(rows, 'org-123');

        // Should have both email format errors AND duplicate error
        const emailFormatErrors = result.errors.filter((e) => e.errorType === 'INVALID_EMAIL_FORMAT');
        const duplicateErrors = result.errors.filter((e) => e.errorType === 'DUPLICATE_EMAIL');

        expect(emailFormatErrors.length).toBeGreaterThanOrEqual(2);
        expect(duplicateErrors.length).toBe(1);
        expect(result.duplicateCount).toBe(1);
      });

      it('should report duplicates separately from validation errors', async () => {
        const rows = [
          { company_name: 'Valid Corp', contact_email: 'test@example.com' },
          { company_name: '', contact_email: 'test@example.com' }, // Missing company name + duplicate
        ];

        const result = await service.validateData(rows, 'org-123');

        expect(result.invalidCount).toBe(1); // Row 2 has validation error
        expect(result.duplicateCount).toBe(1); // Row 2 is also duplicate

        const errors = result.errors;
        expect(errors.some((e) => e.errorType === 'COMPANY_NAME_REQUIRED')).toBe(true);
        expect(errors.some((e) => e.errorType === 'DUPLICATE_EMAIL')).toBe(true);
      });
    });
  });

  describe('Cross-Campaign Duplicate Detection (Story 2.5)', () => {
    describe('Campaign-level Duplicate Detection', () => {
      it('should detect duplicates in same campaign as errors', async () => {
        const rows = [
          { company_name: 'Acme', contact_email: 'john@acme.com' },
          { company_name: 'BetaCorp', contact_email: 'sarah@betacorp.com' },
        ];

        const existingProspects: ExistingProspect[] = [
          {
            id: 'prospect-1',
            contactEmail: 'john@acme.com',
            campaignId: 'campaign-123',
            campaignName: 'Summer Outreach',
            status: 'Sent',
            createdAt: new Date('2026-01-01'),
            daysSinceCreated: 16,
          },
        ];

        mockFindExistingProspectsByEmails.mockResolvedValue(existingProspects);

        const result = await service.validateData(rows, 'org-1', 'campaign-123');

        expect(result.campaignDuplicateCount).toBe(1);
        expect(result.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              rowNumber: 1,
              field: 'contact_email',
              errorType: 'DUPLICATE_EMAIL_CAMPAIGN',
              message: expect.stringContaining('already exists in this campaign'),
              metadata: expect.objectContaining({
                existingProspectId: 'prospect-1',
                campaignId: 'campaign-123',
                campaignName: 'Summer Outreach',
              }),
            }),
          ]),
        );
      });

      it('should not flag duplicates from other campaigns as campaign errors', async () => {
        const rows = [{ company_name: 'Acme', contact_email: 'john@acme.com' }];

        const existingProspects: ExistingProspect[] = [
          {
            id: 'prospect-1',
            contactEmail: 'john@acme.com',
            campaignId: 'campaign-456', // Different campaign
            campaignName: 'Fall Outreach',
            status: 'Sent',
            createdAt: new Date('2026-01-01'),
            daysSinceCreated: 16,
          },
        ];

        mockFindExistingProspectsByEmails.mockResolvedValue(existingProspects);

        const result = await service.validateData(rows, 'org-1', 'campaign-123');

        expect(result.campaignDuplicateCount).toBe(0);
        expect(result.organizationDuplicateCount).toBe(1); // Should be a warning instead
      });

      it('should be case-insensitive for campaign duplicates', async () => {
        const rows = [{ company_name: 'Acme', contact_email: 'John@Acme.Com' }];

        const existingProspects: ExistingProspect[] = [
          {
            id: 'prospect-1',
            contactEmail: 'john@acme.com',
            campaignId: 'campaign-123',
            campaignName: 'Summer Outreach',
            status: 'Sent',
            createdAt: new Date('2026-01-01'),
            daysSinceCreated: 16,
          },
        ];

        mockFindExistingProspectsByEmails.mockResolvedValue(existingProspects);

        const result = await service.validateData(rows, 'org-1', 'campaign-123');

        expect(result.campaignDuplicateCount).toBe(1);
      });
    });

    describe('Organization-level Duplicate Detection (90-day window)', () => {
      it('should detect duplicates in other campaigns within 90 days as warnings', async () => {
        const rows = [{ company_name: 'Acme', contact_email: 'john@acme.com' }];

        const existingProspects: ExistingProspect[] = [
          {
            id: 'prospect-1',
            contactEmail: 'john@acme.com',
            campaignId: 'campaign-456',
            campaignName: 'Fall Outreach',
            status: 'Sent',
            createdAt: new Date('2025-12-01'),
            daysSinceCreated: 47,
          },
        ];

        mockFindExistingProspectsByEmails.mockResolvedValue(existingProspects);

        const result = await service.validateData(rows, 'org-1', 'campaign-123');

        expect(result.organizationDuplicateCount).toBe(1);
        expect(result.warnings).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              rowNumber: 1,
              field: 'contact_email',
              warningType: 'DUPLICATE_EMAIL_ORGANIZATION',
              message: expect.stringMatching(/47 days ago.*Fall Outreach/),
              metadata: expect.objectContaining({
                existingProspectId: 'prospect-1',
                campaignId: 'campaign-456',
                campaignName: 'Fall Outreach',
                daysSinceContact: 47,
              }),
            }),
          ]),
        );
      });

      it('should not flag duplicates older than 90 days', async () => {
        const rows = [{ company_name: 'Acme', contact_email: 'john@acme.com' }];

        const existingProspects: ExistingProspect[] = [
          {
            id: 'prospect-1',
            contactEmail: 'john@acme.com',
            campaignId: 'campaign-456',
            campaignName: 'Summer Outreach',
            status: 'Sent',
            createdAt: new Date('2024-10-01'),
            daysSinceCreated: 108, // > 90 days
          },
        ];

        mockFindExistingProspectsByEmails.mockResolvedValue(existingProspects);

        const result = await service.validateData(rows, 'org-1', 'campaign-123');

        expect(result.organizationDuplicateCount).toBe(0);
        expect(result.warnings).toHaveLength(0);
      });

      it('should keep most recent contact when multiple org duplicates exist', async () => {
        const rows = [{ company_name: 'Acme', contact_email: 'john@acme.com' }];

        const existingProspects: ExistingProspect[] = [
          {
            id: 'prospect-1',
            contactEmail: 'john@acme.com',
            campaignId: 'campaign-456',
            campaignName: 'Old Campaign',
            status: 'Sent',
            createdAt: new Date('2025-11-01'),
            daysSinceCreated: 77,
          },
          {
            id: 'prospect-2',
            contactEmail: 'john@acme.com',
            campaignId: 'campaign-789',
            campaignName: 'Recent Campaign',
            status: 'Sent',
            createdAt: new Date('2026-01-01'),
            daysSinceCreated: 16,
          },
        ];

        mockFindExistingProspectsByEmails.mockResolvedValue(existingProspects);

        const result = await service.validateData(rows, 'org-1', 'campaign-123');

        expect(result.organizationDuplicateCount).toBe(1);
        expect(result.warnings[0].metadata?.daysSinceContact).toBe(16); // Most recent
        expect(result.warnings[0].metadata?.campaignName).toBe('Recent Campaign');
      });
    });

    describe('Duplicate Override', () => {
      it('should skip duplicate detection when override flag is true', async () => {
        const rows = [{ company_name: 'Acme', contact_email: 'john@acme.com' }];

        const result = await service.validateData(rows, 'org-1', 'campaign-123', {
          overrideDuplicates: true,
        });

        expect(mockFindExistingProspectsByEmails).not.toHaveBeenCalled();
        expect(result.campaignDuplicateCount).toBe(0);
        expect(result.organizationDuplicateCount).toBe(0);
      });

      it('should still detect within-upload duplicates when override is true', async () => {
        const rows = [
          { company_name: 'Acme', contact_email: 'john@acme.com' },
          { company_name: 'Beta', contact_email: 'john@acme.com' }, // Within-upload duplicate
        ];

        const result = await service.validateData(rows, 'org-1', 'campaign-123', {
          overrideDuplicates: true,
        });

        expect(result.duplicateCount).toBe(1); // Within-upload duplicates still detected
        expect(result.campaignDuplicateCount).toBe(0); // Cross-campaign skipped
      });
    });

    describe('Performance', () => {
      it('should batch query all emails at once, not individually', async () => {
        const rows = Array.from({ length: 100 }, (_, i) => ({
          company_name: `Company ${i}`,
          contact_email: `user${i}@example.com`,
        }));

        mockFindExistingProspectsByEmails.mockResolvedValue([]);

        await service.validateData(rows, 'org-1', 'campaign-123');

        // Should be called exactly once with all 100 emails
        expect(mockFindExistingProspectsByEmails).toHaveBeenCalledTimes(1);
        expect(mockFindExistingProspectsByEmails).toHaveBeenCalledWith(
          'org-1',
          expect.arrayContaining([
            'user0@example.com',
            'user50@example.com',
            'user99@example.com',
          ]),
        );
      });

      it('should handle empty email list gracefully', async () => {
        const rows = [{ company_name: 'Acme', contact_email: '' }]; // No valid email

        const result = await service.validateData(rows, 'org-1', 'campaign-123');

        // Should not call repository when no valid emails  
        expect(mockFindExistingProspectsByEmails).not.toHaveBeenCalled();
      });
    });

    describe('Integration with Field Validation and Within-Upload Duplicates', () => {
      it('should detect all three types of issues: field errors, within-upload duplicates, and campaign duplicates', async () => {
        const rows = [
          { company_name: 'Acme', contact_email: 'john@acme.com' }, // Valid
          { company_name: '', contact_email: 'sarah@beta.com' }, // Field error
          { company_name: 'Gamma', contact_email: 'john@acme.com' }, // Within-upload duplicate
          { company_name: 'Delta', contact_email: 'existing@example.com' }, // Campaign duplicate
        ];

        const existingProspects: ExistingProspect[] = [
          {
            id: 'prospect-1',
            contactEmail: 'existing@example.com',
            campaignId: 'campaign-123',
            campaignName: 'Current Campaign',
            status: 'Sent',
            createdAt: new Date('2026-01-01'),
            daysSinceCreated: 16,
          },
        ];

        mockFindExistingProspectsByEmails.mockResolvedValue(existingProspects);

        const result = await service.validateData(rows, 'org-1', 'campaign-123');

        // Field validation error
        expect(result.errors.some((e) => e.errorType === 'COMPANY_NAME_REQUIRED')).toBe(true);

        // Within-upload duplicate
        expect(result.duplicateCount).toBe(1);
        expect(result.errors.some((e) => e.errorType === 'DUPLICATE_EMAIL')).toBe(true);

        // Campaign duplicate
        expect(result.campaignDuplicateCount).toBe(1);
        expect(result.errors.some((e) => e.errorType === 'DUPLICATE_EMAIL_CAMPAIGN')).toBe(true);
      });
    });
  });
});
