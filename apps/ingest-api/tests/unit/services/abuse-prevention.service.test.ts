import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  checkHoneypot,
  checkDisposableEmail,
  validateTurnstile,
} from '../../../src/services/abuse-prevention.service.js';

describe('abuse-prevention.service', () => {
  describe('checkHoneypot (AC6.4)', () => {
    it('should allow empty honeypot field', () => {
      const result = checkHoneypot('');
      expect(result.allowed).toBe(true);
    });

    it('should allow undefined honeypot field', () => {
      const result = checkHoneypot(undefined);
      expect(result.allowed).toBe(true);
    });

    it('should allow whitespace-only honeypot field', () => {
      const result = checkHoneypot('   ');
      expect(result.allowed).toBe(true);
    });

    it('should block honeypot field with content', () => {
      const result = checkHoneypot('http://spam.com');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('honeypot');
      expect(result.code).toBe('BOT_DETECTED');
    });

    it('should block honeypot field with any value', () => {
      const result = checkHoneypot('bot filled this');
      expect(result.allowed).toBe(false);
    });
  });

  describe('checkDisposableEmail (AC6.7)', () => {
    beforeEach(() => {
      // Reset environment variable
      delete process.env.BLOCK_DISPOSABLE_EMAILS;
    });

    it('should allow any email when feature is disabled', () => {
      process.env.BLOCK_DISPOSABLE_EMAILS = 'false';
      const result = checkDisposableEmail('test@mailinator.com');
      expect(result.allowed).toBe(true);
    });

    it('should allow any email when env var is not set', () => {
      const result = checkDisposableEmail('test@mailinator.com');
      expect(result.allowed).toBe(true);
    });

    it('should block mailinator.com when enabled', () => {
      process.env.BLOCK_DISPOSABLE_EMAILS = 'true';
      const result = checkDisposableEmail('test@mailinator.com');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('disposable_email');
      expect(result.code).toBe('DISPOSABLE_EMAIL_BLOCKED');
    });

    it('should block guerrillamail.com when enabled', () => {
      process.env.BLOCK_DISPOSABLE_EMAILS = 'true';
      const result = checkDisposableEmail('user@guerrillamail.com');
      expect(result.allowed).toBe(false);
    });

    it('should allow gmail.com when enabled', () => {
      process.env.BLOCK_DISPOSABLE_EMAILS = 'true';
      const result = checkDisposableEmail('user@gmail.com');
      expect(result.allowed).toBe(true);
    });

    it('should allow outlook.com when enabled', () => {
      process.env.BLOCK_DISPOSABLE_EMAILS = 'true';
      const result = checkDisposableEmail('user@outlook.com');
      expect(result.allowed).toBe(true);
    });

    it('should handle case-insensitive domain matching', () => {
      process.env.BLOCK_DISPOSABLE_EMAILS = 'true';
      const result = checkDisposableEmail('TEST@MAILINATOR.COM');
      expect(result.allowed).toBe(false);
    });

    it('should allow emails without @ symbol (handled elsewhere)', () => {
      process.env.BLOCK_DISPOSABLE_EMAILS = 'true';
      const result = checkDisposableEmail('notanemail');
      expect(result.allowed).toBe(true);
    });
  });

  describe('validateTurnstile (AC6.5, AC6.6)', () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
      global.fetch = mockFetch;
      delete process.env.TURNSTILE_SECRET_KEY;
      mockFetch.mockClear();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should allow request when TURNSTILE_SECRET_KEY is not configured', async () => {
      const result = await validateTurnstile('some-token', '192.168.1.1');
      expect(result.allowed).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should block when token is missing but feature is enabled', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'test-secret';
      const result = await validateTurnstile(undefined, '192.168.1.1');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('turnstile_missing');
      expect(result.code).toBe('CAPTCHA_REQUIRED');
    });

    it('should validate token with Cloudflare API when configured', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'test-secret';

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await validateTurnstile('valid-token', '192.168.1.1');

      expect(result.allowed).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
    });

    it('should block when Cloudflare returns success: false', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'test-secret';

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
      });

      const result = await validateTurnstile('invalid-token', '192.168.1.1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('turnstile_invalid');
      expect(result.code).toBe('CAPTCHA_INVALID');
    });

    it('should fail-open when Cloudflare API returns non-200 (AC6.6)', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'test-secret';

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await validateTurnstile('some-token', '192.168.1.1');

      expect(result.allowed).toBe(true); // Fail-open for UX
    });

    it('should fail-open when Cloudflare API throws exception (AC6.6)', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'test-secret';

      mockFetch.mockRejectedValue(new Error('Network timeout'));

      const result = await validateTurnstile('some-token', '192.168.1.1');

      expect(result.allowed).toBe(true); // Fail-open for UX
    });

    it('should send correct parameters to Cloudflare API', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'test-secret-key';

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await validateTurnstile('test-token-123', '203.0.113.5');

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');

      const bodyParams = new URLSearchParams(callArgs[1].body);
      expect(bodyParams.get('secret')).toBe('test-secret-key');
      expect(bodyParams.get('response')).toBe('test-token-123');
      expect(bodyParams.get('remoteip')).toBe('203.0.113.5');
    });
  });
});
