/**
 * URL Normalizer Utility Tests
 * Tests URL validation and normalization
 */
import { describe, it, expect } from 'vitest';
import { normalizeUrl, isValidHttpUrl } from '../../../src/utils/url-normalizer.util.js';

describe('URL Normalizer', () => {
  describe('Add HTTPS Prefix', () => {
    it('should add https:// if missing', () => {
      expect(normalizeUrl('acmecorp.com')).toBe('https://acmecorp.com');
      expect(normalizeUrl('www.example.com')).toBe('https://www.example.com');
      expect(normalizeUrl('subdomain.company.org')).toBe('https://subdomain.company.org');
    });

    it('should preserve existing https://', () => {
      expect(normalizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('should preserve explicit http://', () => {
      expect(normalizeUrl('http://example.com')).toBe('http://example.com');
    });
  });

  describe('Remove Trailing Slashes', () => {
    it('should remove trailing slash from root domain', () => {
      expect(normalizeUrl('https://example.com/')).toBe('https://example.com');
      expect(normalizeUrl('example.com/')).toBe('https://example.com');
    });

    it('should remove trailing slash from paths', () => {
      expect(normalizeUrl('https://example.com/page/')).toBe('https://example.com/page');
      expect(normalizeUrl('https://example.com/path/to/page/')).toBe(
        'https://example.com/path/to/page',
      );
    });

    it('should handle multiple trailing slashes', () => {
      expect(normalizeUrl('https://example.com//')).toBe('https://example.com');
      expect(normalizeUrl('https://example.com///')).toBe('https://example.com');
    });
  });

  describe('Case Normalization', () => {
    it('should normalize domain to lowercase', () => {
      expect(normalizeUrl('HTTPS://EXAMPLE.COM')).toBe('https://example.com');
      expect(normalizeUrl('Example.COM')).toBe('https://example.com');
    });

    it('should preserve path case sensitivity', () => {
      expect(normalizeUrl('https://example.com/MyPath/Document.pdf')).toBe(
        'https://example.com/MyPath/Document.pdf',
      );
      expect(normalizeUrl('Example.COM/API/Users')).toBe('https://example.com/API/Users');
    });
  });

  describe('Invalid URLs', () => {
    it('should reject invalid protocols', () => {
      expect(() => normalizeUrl('ftp://example.com')).toThrow('Invalid protocol');
      expect(() => normalizeUrl('file:///path/to/file')).toThrow('Invalid protocol');
      // javascript: URLs may not parse as valid URLs, so they get caught as invalid format
    });

    it('should reject malformed URLs', () => {
      expect(() => normalizeUrl('not a url')).toThrow();
      expect(() => normalizeUrl('http://')).toThrow();
      expect(() => normalizeUrl('://example.com')).toThrow();
    });

    it('should reject empty or whitespace strings', () => {
      expect(() => normalizeUrl('')).toThrow();
      expect(() => normalizeUrl('   ')).toThrow();
    });
  });

  describe('Valid HTTP URL Check', () => {
    it('should validate http/https URLs', () => {
      expect(isValidHttpUrl('https://example.com')).toBe(true);
      expect(isValidHttpUrl('http://example.com')).toBe(true);
    });

    it('should reject non-http protocols', () => {
      expect(isValidHttpUrl('ftp://example.com')).toBe(false);
      expect(isValidHttpUrl('file:///path')).toBe(false);
    });

    it('should reject invalid URLs', () => {
      expect(isValidHttpUrl('not a url')).toBe(false);
      expect(isValidHttpUrl('')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle URLs with ports', () => {
      expect(normalizeUrl('example.com:8080')).toBe('https://example.com:8080');
      // URL API removes default ports (443 for https, 80 for http)
      expect(normalizeUrl('https://example.com:443/')).toBe('https://example.com');
    });

    it('should handle URLs with query strings', () => {
      expect(normalizeUrl('example.com?param=value')).toBe('https://example.com?param=value');
      expect(normalizeUrl('https://example.com/page?q=test')).toBe(
        'https://example.com/page?q=test',
      );
    });

    it('should handle URLs with fragments', () => {
      expect(normalizeUrl('example.com#section')).toBe('https://example.com#section');
    });

    it('should handle international domains', () => {
      // URL API converts internationalized domains to punycode
      const result = normalizeUrl('münchen.de');
      expect(result).toMatch(/^https:\/\/(xn--mnchen-3ya\.de|münchen\.de)$/);
    });
  });
});
