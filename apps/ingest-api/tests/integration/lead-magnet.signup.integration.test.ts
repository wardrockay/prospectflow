// tests/integration/lead-magnet.signup.integration.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { getPool, closePool } from '../../src/config/database.js';
import * as emailService from '../../src/services/email.service.js';

// Mock email service to avoid sending real emails
vi.mock('../../src/services/email.service.js', () => ({
  sendConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('Lead Magnet Signup Integration', () => {
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
    
    // Reset mock
    vi.clearAllMocks();
  });

  describe('POST /api/lead-magnet/signup', () => {
    const validRequest = {
      email: 'test@example.com',
      consentGiven: true,
      source: 'test',
    };

    it('should create new subscriber with valid email', async () => {
      // Act
      const response = await request(app)
        .post('/api/lead-magnet/signup')
        .send(validRequest);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: 'Email envoyé',
      });

      // Verify database records
      const subscriber = await pool.query(
        'SELECT * FROM lm_subscribers WHERE LOWER(email) = LOWER($1)',
        [validRequest.email],
      );
      expect(subscriber.rows.length).toBe(1);
      expect(subscriber.rows[0].status).toBe('pending');
      expect(subscriber.rows[0].source).toBe('test');

      // Verify email was sent
      expect(emailService.sendConfirmationEmail).toHaveBeenCalledTimes(1);
      expect(emailService.sendConfirmationEmail).toHaveBeenCalledWith(
        validRequest.email.toLowerCase(),
        expect.any(String), // token
      );
    });

    it('should normalize email to lowercase', async () => {
      // Arrange
      const request1 = { ...validRequest, email: 'Test@Example.Com' };

      // Act
      const response = await request(app)
        .post('/api/lead-magnet/signup')
        .send(request1);

      // Assert
      expect(response.status).toBe(200);

      const subscriber = await pool.query(
        'SELECT * FROM lm_subscribers WHERE email = $1',
        ['test@example.com'],
      );
      expect(subscriber.rows.length).toBe(1);
    });

    it('should create consent event and download token', async () => {
      // Act
      await request(app)
        .post('/api/lead-magnet/signup')
        .send(validRequest);

      // Assert
      const subscriber = await pool.query(
        'SELECT id FROM lm_subscribers WHERE LOWER(email) = LOWER($1)',
        [validRequest.email],
      );
      const subscriberId = subscriber.rows[0].id;

      // Check consent event
      const consentEvent = await pool.query(
        'SELECT * FROM lm_consent_events WHERE subscriber_id = $1',
        [subscriberId],
      );
      expect(consentEvent.rows.length).toBe(1);
      expect(consentEvent.rows[0].event_type).toBe('signup');

      // Check download token
      const token = await pool.query(
        'SELECT * FROM lm_download_tokens WHERE subscriber_id = $1',
        [subscriberId],
      );
      expect(token.rows.length).toBe(1);
      expect(token.rows[0].purpose).toBe('confirm_and_download');
      expect(token.rows[0].token_hash).toBeTruthy();
    });

    it('should return 400 for invalid email format', async () => {
      // Arrange
      const invalidRequest = { ...validRequest, email: 'not-an-email' };

      // Act
      const response = await request(app)
        .post('/api/lead-magnet/signup')
        .send(invalidRequest);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 when consent not given', async () => {
      // Arrange
      const noConsentRequest = { ...validRequest, consentGiven: false };

      // Act
      const response = await request(app)
        .post('/api/lead-magnet/signup')
        .send(noConsentRequest);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('accepter');
    });

    it('should return 400 for already confirmed email', async () => {
      // Arrange - Create confirmed subscriber
      const result = await pool.query(
        `INSERT INTO lm_subscribers (email, status, source)
         VALUES ($1, $2, $3)
         RETURNING id`,
        ['test-confirmed@example.com', 'confirmed', 'test'],
      );

      // Act
      const response = await request(app)
        .post('/api/lead-magnet/signup')
        .send({ ...validRequest, email: 'test-confirmed@example.com' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('déjà inscrit');
      expect(response.body.code).toBe('ALREADY_SUBSCRIBED');
    });

    it('should return 400 for unsubscribed email', async () => {
      // Arrange - Create unsubscribed subscriber
      await pool.query(
        `INSERT INTO lm_subscribers (email, status, source)
         VALUES ($1, $2, $3)`,
        ['test-unsubscribed@example.com', 'unsubscribed', 'test'],
      );

      // Act
      const response = await request(app)
        .post('/api/lead-magnet/signup')
        .send({ ...validRequest, email: 'test-unsubscribed@example.com' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('désinscrite');
      expect(response.body.code).toBe('UNSUBSCRIBED');
    });

    it('should resend email for pending subscriber with expired token', async () => {
      // Arrange - Create pending subscriber with expired token
      const subResult = await pool.query(
        `INSERT INTO lm_subscribers (email, status, source)
         VALUES ($1, $2, $3)
         RETURNING id`,
        ['test-pending@example.com', 'pending', 'test'],
      );
      const subscriberId = subResult.rows[0].id;

      await pool.query(
        `INSERT INTO lm_download_tokens 
         (subscriber_id, token_hash, purpose, expires_at, max_uses)
         VALUES ($1, $2, $3, NOW() - INTERVAL '1 day', 999)`,
        [subscriberId, 'expired-hash', 'confirm_and_download'],
      );

      // Act
      const response = await request(app)
        .post('/api/lead-magnet/signup')
        .send({ ...validRequest, email: 'test-pending@example.com' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('renvoyé');
      expect(emailService.sendConfirmationEmail).toHaveBeenCalledTimes(1);

      // Verify new token created
      const tokens = await pool.query(
        `SELECT * FROM lm_download_tokens 
         WHERE subscriber_id = $1 
         ORDER BY created_at DESC`,
        [subscriberId],
      );
      expect(tokens.rows.length).toBe(2); // Old + new token
    });

    it('should not resend email for pending subscriber with valid token', async () => {
      // Arrange - Create pending subscriber with valid token
      const subResult = await pool.query(
        `INSERT INTO lm_subscribers (email, status, source)
         VALUES ($1, $2, $3)
         RETURNING id`,
        ['test-valid-token@example.com', 'pending', 'test'],
      );
      const subscriberId = subResult.rows[0].id;

      await pool.query(
        `INSERT INTO lm_download_tokens 
         (subscriber_id, token_hash, purpose, expires_at, max_uses)
         VALUES ($1, $2, $3, NOW() + INTERVAL '1 day', 999)`,
        [subscriberId, 'valid-hash', 'confirm_and_download'],
      );

      // Act
      const response = await request(app)
        .post('/api/lead-magnet/signup')
        .send({ ...validRequest, email: 'test-valid-token@example.com' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('déjà envoyé');
      expect(emailService.sendConfirmationEmail).not.toHaveBeenCalled();
    });

    it('should enforce rate limiting (3 signups per 7 days)', async () => {
      // Arrange - Create subscriber with 3 signup events in last 7 days
      const subResult = await pool.query(
        `INSERT INTO lm_subscribers (email, status, source)
         VALUES ($1, $2, $3)
         RETURNING id`,
        ['test-ratelimit@example.com', 'pending', 'test'],
      );
      const subscriberId = subResult.rows[0].id;

      for (let i = 0; i < 3; i++) {
        await pool.query(
          `INSERT INTO lm_consent_events 
           (subscriber_id, event_type, occurred_at)
           VALUES ($1, 'signup', NOW() - INTERVAL '${i} days')`,
          [subscriberId],
        );
      }

      // Act - 4th attempt should fail
      const response = await request(app)
        .post('/api/lead-magnet/signup')
        .send({ ...validRequest, email: 'test-ratelimit@example.com' });

      // Assert
      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('déjà demandé');
      expect(response.body.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should capture IP address and user agent', async () => {
      // Act
      const response = await request(app)
        .post('/api/lead-magnet/signup')
        .set('User-Agent', 'test-agent/1.0')
        .set('X-Forwarded-For', '192.168.1.100')
        .send(validRequest);

      // Assert
      expect(response.status).toBe(200);

      const subscriber = await pool.query(
        'SELECT id FROM lm_subscribers WHERE LOWER(email) = LOWER($1)',
        [validRequest.email],
      );
      const subscriberId = subscriber.rows[0].id;

      const consentEvent = await pool.query(
        'SELECT * FROM lm_consent_events WHERE subscriber_id = $1',
        [subscriberId],
      );
      
      expect(consentEvent.rows[0].ip).toBe('192.168.1.100');
      expect(consentEvent.rows[0].user_agent).toBe('test-agent/1.0');
    });
  });
});
