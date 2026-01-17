/**
 * Unit tests for ExportErrorsService
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportErrorsService } from '../../../src/services/export-errors.service.js';
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

describe('ExportErrorsService', () => {
  let exportService: ExportErrorsService;

  beforeEach(() => {
    exportService = new ExportErrorsService();
  });

  describe('generateErrorCSV', () => {
    it('should generate CSV with error rows', () => {
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
            message: 'Invalid email format',
            originalValue: 'invalid-email',
          },
          {
            rowNumber: 2,
            field: 'company_name',
            errorType: 'COMPANY_NAME_REQUIRED',
            message: 'Company name is required',
            originalValue: '',
          },
        ],
        warnings: [],
        validRows: [],
        invalidRows: [
          {
            company_name: 'Acme Corp',
            contact_email: 'invalid-email',
            contact_name: 'John Doe',
            website_url: 'https://acme.com',
          },
          {
            company_name: '',
            contact_email: 'jane@beta.com',
            contact_name: 'Jane Smith',
            website_url: '',
          },
        ],
      };

      // Act
      const csv = exportService.generateErrorCSV(validationResult);

      // Assert
      expect(csv).toContain('Row,Company_Name,Contact_Email,Contact_Name,Website_URL,Error_Type,Error_Reason');
      expect(csv).toContain('1,Acme Corp,invalid-email,John Doe,https://acme.com,INVALID_EMAIL_FORMAT,Invalid email format');
      expect(csv).toContain('2,,jane@beta.com,Jane Smith,,COMPANY_NAME_REQUIRED,Company name is required');
    });

    it('should return empty CSV with headers when no errors', () => {
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
          { company_name: 'Acme', contact_email: 'john@acme.com' },
        ],
        invalidRows: [],
      };

      // Act
      const csv = exportService.generateErrorCSV(validationResult);

      // Assert
      expect(csv).toContain('Row,Company_Name,Contact_Email,Contact_Name,Website_URL,Error_Type,Error_Reason');
      expect(csv.split('\n').length).toBe(2); // Header + empty line
    });

    it('should handle missing optional fields', () => {
      // Arrange
      const validationResult: ValidationResult = {
        validCount: 0,
        invalidCount: 1,
        totalErrorCount: 1,
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
            originalValue: 'bad',
          },
        ],
        warnings: [],
        validRows: [],
        invalidRows: [
          {
            company_name: 'Acme',
            contact_email: 'bad',
          },
        ],
      };

      // Act
      const csv = exportService.generateErrorCSV(validationResult);

      // Assert
      expect(csv).toContain('1,Acme,bad,,,INVALID_EMAIL_FORMAT,Invalid email');
    });

    it('should handle special characters in data', () => {
      // Arrange
      const validationResult: ValidationResult = {
        validCount: 0,
        invalidCount: 1,
        totalErrorCount: 1,
        warningCount: 0,
        duplicateCount: 0,
        campaignDuplicateCount: 0,
        organizationDuplicateCount: 0,
        errors: [
          {
            rowNumber: 1,
            field: 'company_name',
            errorType: 'COMPANY_NAME_INVALID',
            message: 'Company name contains invalid characters',
            originalValue: 'Acme, Inc.',
          },
        ],
        warnings: [],
        validRows: [],
        invalidRows: [
          {
            company_name: 'Acme, Inc.',
            contact_email: 'test@acme.com',
            contact_name: 'John "The Boss" Doe',
            website_url: '',
          },
        ],
      };

      // Act
      const csv = exportService.generateErrorCSV(validationResult);

      // Assert
      expect(csv).toContain('"Acme, Inc."'); // CSV should quote fields with commas
      expect(csv).toContain('"John ""The Boss"" Doe"'); // CSV should escape quotes
    });
  });
});
