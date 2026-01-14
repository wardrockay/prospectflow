/**
 * Email Validator Utility Tests
 * Tests RFC 5322 compliant email validation
 */
import { describe, it, expect } from 'vitest';
import { validateEmail, isRFC5322Email } from '../../../src/utils/email-validator.util.js';

describe('Email Validator', () => {
  describe('Valid Emails', () => {
    it('should accept standard email formats', () => {
      expect(validateEmail('sarah@acmecorp.com')).toBe(true);
      expect(validateEmail('sarah.johnson@acme-corp.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.com')).toBe(true);
    });

    it('should accept emails with subdomains', () => {
      expect(validateEmail('test@subdomain.example.com')).toBe(true);
      expect(validateEmail('admin@mail.company.org')).toBe(true);
    });

    it('should accept emails with numbers and special characters', () => {
      expect(validateEmail('user123@example.com')).toBe(true);
      expect(validateEmail('first.last@example.com')).toBe(true);
      expect(validateEmail('user_name@example.com')).toBe(true);
      expect(validateEmail('user-name@example.com')).toBe(true);
    });

    it('should handle Unicode characters (internationalized emails)', () => {
      // Note: This is optional depending on requirements
      expect(validateEmail('françois@société.fr')).toBe(true);
      expect(validateEmail('user@例え.jp')).toBe(true);
    });
  });

  describe('Invalid Emails', () => {
    it('should reject emails without @ symbol', () => {
      expect(validateEmail('invalid.email')).toBe(false);
      expect(validateEmail('user.example.com')).toBe(false);
    });

    it('should reject emails without local part', () => {
      expect(validateEmail('@example.com')).toBe(false);
    });

    it('should reject emails without domain', () => {
      expect(validateEmail('user@')).toBe(false);
    });

    it('should reject emails with spaces', () => {
      expect(validateEmail('user @example.com')).toBe(false);
      expect(validateEmail('user@ example.com')).toBe(false);
      // Note: Leading/trailing spaces are trimmed, so these become valid after trim
      // If you need strict validation without trimming, remove the trim() in the util
    });

    it('should reject emails without TLD', () => {
      expect(validateEmail('test@example')).toBe(false);
    });

    it('should reject emails with invalid characters', () => {
      expect(validateEmail('user@exam ple.com')).toBe(false);
      expect(validateEmail('user<>@example.com')).toBe(false);
    });

    it('should reject empty or whitespace-only strings', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('   ')).toBe(false);
    });
  });

  describe('RFC 5322 Compliance', () => {
    it('should validate RFC 5322 format', () => {
      expect(isRFC5322Email('valid@example.com')).toBe(true);
      expect(isRFC5322Email('user.name+tag@example.co.uk')).toBe(true);
    });

    it('should reject non-RFC 5322 format', () => {
      expect(isRFC5322Email('invalid')).toBe(false);
      expect(isRFC5322Email('@example.com')).toBe(false);
    });
  });
});
