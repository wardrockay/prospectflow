/**
 * Tests for Email Normalizer Utility
 */
import { describe, it, expect } from 'vitest';
import { normalizeEmail } from '../../../src/utils/email-normalizer.util.js';

describe('normalizeEmail', () => {
  it('should convert email to lowercase', () => {
    expect(normalizeEmail('John@Example.COM')).toBe('john@example.com');
    expect(normalizeEmail('SARAH@ACME.COM')).toBe('sarah@acme.com');
    expect(normalizeEmail('MixedCase@Test.Com')).toBe('mixedcase@test.com');
  });

  it('should trim leading and trailing whitespace', () => {
    expect(normalizeEmail('  john@example.com  ')).toBe('john@example.com');
    expect(normalizeEmail('\tjohn@example.com\t')).toBe('john@example.com');
    expect(normalizeEmail('\njohn@example.com\n')).toBe('john@example.com');
    expect(normalizeEmail('   john@example.com')).toBe('john@example.com');
    expect(normalizeEmail('john@example.com   ')).toBe('john@example.com');
  });

  it('should handle both case conversion and trimming', () => {
    expect(normalizeEmail('  John@Example.COM  ')).toBe('john@example.com');
    expect(normalizeEmail('\t SARAH@ACME.COM \n')).toBe('sarah@acme.com');
  });

  it('should return empty string for undefined', () => {
    expect(normalizeEmail(undefined)).toBe('');
  });

  it('should return empty string for empty string', () => {
    expect(normalizeEmail('')).toBe('');
  });

  it('should preserve email structure', () => {
    expect(normalizeEmail('user+tag@example.com')).toBe('user+tag@example.com');
    expect(normalizeEmail('user.name@example.com')).toBe('user.name@example.com');
    expect(normalizeEmail('user_name@example.com')).toBe('user_name@example.com');
  });

  it('should handle international characters', () => {
    expect(normalizeEmail('ÜSER@EXAMPLE.COM')).toBe('üser@example.com');
    expect(normalizeEmail('Café@Example.com')).toBe('café@example.com');
  });
});
