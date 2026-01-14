import { describe, it, expect, beforeEach } from 'vitest';
import { ColumnValidatorService } from '../../../src/services/column-validator.service.js';

describe('ColumnValidatorService', () => {
  let service: ColumnValidatorService;

  beforeEach(() => {
    service = new ColumnValidatorService();
  });

  describe('suggestMappings', () => {
    it('should suggest exact matches with high confidence', () => {
      const detectedColumns = ['company_name', 'contact_email', 'website_url'];
      const mappings = service.suggestMappings(detectedColumns);

      expect(mappings).toHaveLength(3);
      expect(mappings[0]).toEqual({
        detected: 'company_name',
        suggested: 'company_name',
        confidence: 'high',
        required: true,
      });
      expect(mappings[1]).toEqual({
        detected: 'contact_email',
        suggested: 'contact_email',
        confidence: 'high',
        required: true,
      });
      expect(mappings[2]).toEqual({
        detected: 'website_url',
        suggested: 'website_url',
        confidence: 'high',
        required: false,
      });
    });

    it('should suggest mappings for common aliases with high confidence', () => {
      const detectedColumns = ['email', 'company', 'website'];
      const mappings = service.suggestMappings(detectedColumns);

      expect(mappings[0]).toEqual({
        detected: 'email',
        suggested: 'contact_email',
        confidence: 'high',
        required: true,
      });
      expect(mappings[1]).toEqual({
        detected: 'company',
        suggested: 'company_name',
        confidence: 'high',
        required: true,
      });
      expect(mappings[2]).toEqual({
        detected: 'website',
        suggested: 'website_url',
        confidence: 'high',
        required: false,
      });
    });

    it('should be case-insensitive when matching', () => {
      const detectedColumns = ['Email', 'COMPANY', 'WebSite'];
      const mappings = service.suggestMappings(detectedColumns);

      expect(mappings[0].suggested).toBe('contact_email');
      expect(mappings[1].suggested).toBe('company_name');
      expect(mappings[2].suggested).toBe('website_url');
    });

    it('should handle partial matches with medium confidence', () => {
      const detectedColumns = ['company_name_full', 'contact_address'];
      const mappings = service.suggestMappings(detectedColumns);

      expect(mappings[0]).toEqual({
        detected: 'company_name_full',
        suggested: 'company_name',
        confidence: 'medium',
        required: true,
      });
      expect(mappings[1]).toEqual({
        detected: 'contact_address',
        suggested: 'contact_email',
        confidence: 'medium',
        required: true,
      });
    });

    it('should return low confidence for unknown columns', () => {
      const detectedColumns = ['random_column', 'unknown_field'];
      const mappings = service.suggestMappings(detectedColumns);

      expect(mappings[0]).toEqual({
        detected: 'random_column',
        suggested: '',
        confidence: 'low',
        required: false,
      });
      expect(mappings[1]).toEqual({
        detected: 'unknown_field',
        suggested: '',
        confidence: 'low',
        required: false,
      });
    });

    it('should handle French column names', () => {
      const detectedColumns = ['nom', 'mail', 'site_web'];
      const mappings = service.suggestMappings(detectedColumns);

      expect(mappings[0].suggested).toBe('contact_name');
      expect(mappings[1].suggested).toBe('contact_email');
      expect(mappings[2].suggested).toBe('website_url');
    });

    it('should trim whitespace from column names', () => {
      const detectedColumns = [' email ', ' company '];
      const mappings = service.suggestMappings(detectedColumns);

      expect(mappings[0].suggested).toBe('contact_email');
      expect(mappings[1].suggested).toBe('company_name');
    });
  });

  describe('validateRequiredColumns', () => {
    it('should validate when all required columns are mapped', () => {
      const mappings = [
        {
          detected: 'email',
          suggested: 'contact_email',
          confidence: 'high' as const,
          required: true,
        },
        {
          detected: 'company',
          suggested: 'company_name',
          confidence: 'high' as const,
          required: true,
        },
      ];

      const result = service.validateRequiredColumns(mappings);

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should detect missing required columns', () => {
      const mappings = [
        {
          detected: 'company',
          suggested: 'company_name',
          confidence: 'high' as const,
          required: true,
        },
        {
          detected: 'website',
          suggested: 'website_url',
          confidence: 'high' as const,
          required: false,
        },
      ];

      const result = service.validateRequiredColumns(mappings);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['contact_email']);
    });

    it('should accept optional columns as non-required', () => {
      const mappings = [
        {
          detected: 'email',
          suggested: 'contact_email',
          confidence: 'high' as const,
          required: true,
        },
        {
          detected: 'company',
          suggested: 'company_name',
          confidence: 'high' as const,
          required: true,
        },
        {
          detected: 'name',
          suggested: 'contact_name',
          confidence: 'high' as const,
          required: false,
        },
      ];

      const result = service.validateRequiredColumns(mappings);

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should ignore unmapped columns (empty suggested)', () => {
      const mappings = [
        {
          detected: 'email',
          suggested: 'contact_email',
          confidence: 'high' as const,
          required: true,
        },
        {
          detected: 'company',
          suggested: 'company_name',
          confidence: 'high' as const,
          required: true,
        },
        { detected: 'random', suggested: '', confidence: 'low' as const, required: false },
      ];

      const result = service.validateRequiredColumns(mappings);

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should detect all missing required columns', () => {
      const mappings = [
        { detected: 'random', suggested: '', confidence: 'low' as const, required: false },
      ];

      const result = service.validateRequiredColumns(mappings);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['company_name', 'contact_email']);
    });
  });

  describe('getRequiredColumns', () => {
    it('should return list of required columns', () => {
      const required = service.getRequiredColumns();

      expect(required).toEqual(['company_name', 'contact_email']);
    });
  });

  describe('getOptionalColumns', () => {
    it('should return list of optional columns', () => {
      const optional = service.getOptionalColumns();

      expect(optional).toEqual(['contact_name', 'website_url']);
    });
  });
});
