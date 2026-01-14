/**
 * Data Validator Service Tests
 * Tests field-level data validation for prospect imports
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataValidatorService } from '../../../src/services/data-validator.service.js';

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

describe('DataValidatorService', () => {
  let service: DataValidatorService;

  beforeEach(() => {
    service = new DataValidatorService();
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
});
