// tests/integration/lead-magnet-abuse-prevention.integration.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { getPool, closePool } from '../../src/config/database.js';
import * as emailService from '../../src/services/email.service.js';

// Mock email service to avoid sending real emails
vi.mock('../../src/services/email.service.js', () => ({
  sendConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('Lead Magnet Abuse Prevention Integration', () => {
  const pool = getPool();

  beforeAll(async () => {
    // Ensure database connection
    await pool.query('SELECT 1');
  });

  afterAll(async () => {
    // Clean up
    await closePool();
  });

  beforeEach(async () => {
    // Clean test data before each test
    await pool.query(`DELETE FROM lm_subscribers WHERE email LIKE 'test%@example.com'`);
    await pool.query(
      `DELETE FROM lm_subscribers WHERE email LIKE '%@mailinator.com' OR email LIKE '%@guerrillamail.com'`,
    );

    // Reset mock
    vi.clearAllMocks();

    // Reset environment variables
    delete process.env.BLOCK_DISPOSABLE_EMAILS;
    delete process.env.TURNSTILE_SECRET_KEY;
  });

  describe('IP Rate Limiting (AC6.1, AC6.2, AC6.3)', () => {
    it('should allow 10 requests from same IP', async () => {
      const testIp = '192.168.1.100';

      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/api/lead-magnet/signup')
          .set('X-Forwarded-For', testIp)
          .send({
            email: `test${i}@example.com`,
            consentGiven: true,
          });

        expect(response.status).toBe(200);
      }
    });

    it('should return 429 after exceeding IP limit', async () => {
      const testIp = '192.168.1.101';

      // Make 10 successful requests
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/lead-magnet/signup')
          .set('X-Forwarded-For', testIp)
          .send({
            email: `test${i}@example.com`,
            consentGiven: true,
          });
      }

      // 11th request should be rate limited
      const response = await request(app)
        .post('/api/lead-magnet/signup')
        .set('X-Forwarded-For', testIp)
        .send({
          email: 'test11@example.com',
          consentGiven: true,
        });

      expect(response.status).toBe(429);
      expect(response.body).toMatchObject({
        success: false,
        error: 'IP_RATE_LIMIT_EXCEEDED',
      });
      expect(response.headers['retry-after']).toBeDefined();
    });

    it('should handle different IPs independently', async () => {
      // IP 1: reach limit
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/lead-magnet/signup')
          .set('X-Forwarded-For', '192.168.1.200')
          .send({
            email: `testip1-${i}@example.com`,
            consentGiven: true,
          });
      }

      // IP 2: should still work
      const response = await request(app)
        .post('/api/lead-magnet/signup')
        .set('X-Forwarded-For', '192.168.1.201')
        .send({
          email: 'testip2@example.com',
          consentGiven: true,
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Honeypot Detection (AC6.4)', () => {
    it('should silently accept honeypot-filled requests', async () => {
      const response = await request(app)
        .post('/api/lead-magnet/signup')
        .send({
          email: 'bot@example.com',
          consentGiven: true,
          website: 'http://spam-link.com', // Honeypot filled by bot
        });

      // Returns success but doesn't actually process
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Email envoyé');

      // Verify email was NOT sent
      expect(emailService.sendConfirmationEmail).not.toHaveBeenCalled();

      // Verify subscriber was NOT created
      const subscriber = await pool.query(
        'SELECT * FROM lm_subscribers WHERE email = $1',
        ['bot@example.com'],
      );
      expect(subscriber.rows.length).toBe(0);
    });

    it('should allow empty honeypot field', async () => {
      const response = await request(app)
        .post('/api/lead-magnet/signup')
        .send({
          email: 'legitimate@example.com',
          consentGiven: true,
          website: '', // Empty honeypot (legitimate user)
        });

      expect(response.status).toBe(200);
      expect(emailService.sendConfirmationEmail).toHaveBeenCalledTimes(1);

      // Verify subscriber was created
      const subscriber = await pool.query(
        'SELECT * FROM lm_subscribers WHERE email = $1',
        ['legitimate@example.com'],
      );
      expect(subscriber.rows.length).toBe(1);
    });
  });

  describe('Disposable Email Blocking (AC6.7)', () => {
    it('should block mailinator.com when feature enabled', async () => {
      process.env.BLOCK_DISPOSABLE_EMAILS = 'true';

      const response = await request(app)
        .post('/api/lead-magnet/signup')
        .send({
          email: 'test@mailinator.com',
          consentGiven: true,
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        code: 'DISPOSABLE_EMAIL_BLOCKED',
        message: 'Veuillez utiliser une adresse email permanente.',
      });

      // Verify subscriber was NOT created
      const subscriber = await pool.query(
        'SELECT * FROM lm_subscribers WHERE email = $1',
        ['test@mailinator.com'],
      );
      expect(subscriber.rows.length).toBe(0);
    });

    it('should block guerrillamail.com when feature enabled', async () => {
      process.env.BLOCK_DISPOSABLE_EMAILS = 'true';

      const response = await request(app)
        .post('/api/lead-magnet/signup')
        .send({
          email: 'user@guerrillamail.com',
          consentGiven: true,
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('DISPOSABLE_EMAIL_BLOCKED');
    });

    it('should allow disposable emails when feature disabled', async () => {
      process.env.BLOCK_DISPOSABLE_EMAILS = 'false';

      const response = await request(app)
        .post('/api/lead-magnet/signup')
        .send({
          email: 'test@mailinator.com',
          consentGiven: true,
        });

      expect(response.status).toBe(200);
      expect(emailService.sendConfirmationEmail).toHaveBeenCalledTimes(1);
    });

    it('should allow legitimate emails when feature enabled', async () => {
      process.env.BLOCK_DISPOSABLE_EMAILS = 'true';

      const response = await request(app)
        .post('/api/lead-magnet/signup')
        .send({
          email: 'user@gmail.com',
          consentGiven: true,
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Turnstile Integration (AC6.5, AC6.6)', () => {
    it('should allow requests when Turnstile not configured', async () => {
      // No TURNSTILE_SECRET_KEY set

      const response = await request(app)
        .post('/api/lead-magnet/signup')
        .send({
          email: 'test@example.com',
          consentGiven: true,
        });

      expect(response.status).toBe(200);
    });

    it('should reject when Turnstile enabled but token missing', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'test-secret';

      const response = await request(app)
        .post('/api/lead-magnet/signup')
        .send({
          email: 'test@example.com',
          consentGiven: true,
          // No cf-turnstile-response token
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('CAPTCHA_REQUIRED');
    });
  });

  describe('Order of Checks (AC6.10)', () => {
    it('should apply IP rate limit BEFORE email checks', async () => {
      const testIp = '192.168.1.150';

      // Reach IP limit with different emails
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/lead-magnet/signup')
          .set('X-Forwarded-For', testIp)
          .send({
            email: `test${i}@example.com`,
            consentGiven: true,
          });
      }

      // Should be blocked by IP rate limit (not reach email validation)
      const response = await request(app)
        .post('/api/lead-magnet/signup')
        .set('X-Forwarded-For', testIp)
        .send({
          email: 'test11@example.com',
          consentGiven: true,
        });

      expect(response.status).toBe(429);
      expect(response.body.error).toBe('IP_RATE_LIMIT_EXCEEDED');
    });

    it('should check honeypot BEFORE disposable email', async () => {
      process.env.BLOCK_DISPOSABLE_EMAILS = 'true';

      const response = await request(app)
        .post('/api/lead-magnet/signup')
        .send({
          email: 'bot@mailinator.com', // Both honeypot and disposable
          consentGiven: true,
          website: 'http://spam.com', // Honeypot filled
        });

      // Should be caught by honeypot (silently)
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // NOT rejected as disposable email
      expect(response.body.code).not.toBe('DISPOSABLE_EMAIL_BLOCKED');
    });
  });

  describe('Existing LM-002 Tests Compatibility (AC6.10)', () => {
    it('should still respect email rate limiting', async () => {
      const email = 'ratelimit@example.com';

      // First signup
      await request(app).post('/api/lead-magnet/signup').send({
        email,
        consentGiven: true,
      });

      // Attempt 3 more within 7 days (total 4, exceeds limit of 3)
      for (let i = 0; i < 3; i++) {
        await request(app).post('/api/lead-magnet/signup').send({
          email,
          consentGiven: true,
        });
      }

      // 4th attempt should be blocked by email rate limit
      const response = await request(app).post('/api/lead-magnet/signup').send({
        email,
        consentGiven: true,
      });

      expect(response.status).toBe(429);
      expect(response.body.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });
});
