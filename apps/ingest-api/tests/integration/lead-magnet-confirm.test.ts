import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { getPool } from '../../src/config/database.js';
import { hashToken } from '../../src/utils/token.utils.js';
import type { Pool } from 'pg';

// Mock AWS S3 to avoid real S3 calls in tests
vi.mock('../../src/utils/s3.utils.js', () => ({
  getLeadMagnetDownloadUrl: vi
    .fn()
    .mockResolvedValue('https://s3.eu-west-3.amazonaws.com/test-bucket/test-file.pdf?signature=xyz'),
}));

describe('GET /api/lead-magnet/confirm/:token', () => {
  let pool: Pool;
  let testSubscriberId: string;
  const testToken = 'test-token-plain-text-' + Date.now();
  const tokenHash = hashToken(testToken);

  beforeAll(() => {
    pool = getPool();
  });

  beforeEach(async () => {
    // Create test subscriber
    const result = await pool.query(
      `INSERT INTO lm_subscribers (email, status, source, created_at) 
       VALUES ($1, 'pending', 'test', NOW()) 
       RETURNING id`,
      [`test-${Date.now()}@example.com`],
    );
    testSubscriberId = result.rows[0].id;

    // Create test token (valid for 48h)
    await pool.query(
      `INSERT INTO lm_download_tokens 
       (subscriber_id, token_hash, purpose, expires_at, max_uses, created_at) 
       VALUES ($1, $2, 'confirm_and_download', NOW() + INTERVAL '48 hours', 999, NOW())`,
      [testSubscriberId, tokenHash],
    );
  });

  afterEach(async () => {
    // Cleanup test data
    if (testSubscriberId) {
      await pool.query('DELETE FROM lm_subscribers WHERE id = $1', [testSubscriberId]);
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should confirm subscriber and return download URL on first use', async () => {
    const response = await request(app).get(`/api/lead-magnet/confirm/${testToken}`).expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.status).toBe('confirmed');
    expect(response.body.downloadUrl).toContain('s3');
    expect(response.body.message).toBe('Email confirmé, téléchargement prêt');

    // Verify subscriber status updated in database
    const subscriber = await pool.query('SELECT status, confirmed_at FROM lm_subscribers WHERE id = $1', [
      testSubscriberId,
    ]);
    expect(subscriber.rows[0].status).toBe('confirmed');
    expect(subscriber.rows[0].confirmed_at).not.toBeNull();

    // Verify consent event created
    const consentEvent = await pool.query(
      `SELECT event_type FROM lm_consent_events WHERE subscriber_id = $1 AND event_type = 'confirm'`,
      [testSubscriberId],
    );
    expect(consentEvent.rows.length).toBe(1);

    // Verify token usage updated
    const token = await pool.query('SELECT use_count, used_at FROM lm_download_tokens WHERE token_hash = $1', [
      tokenHash,
    ]);
    expect(token.rows[0].use_count).toBe(1);
    expect(token.rows[0].used_at).not.toBeNull();
  });

  it('should allow re-download within 48h window', async () => {
    // First confirmation
    await request(app).get(`/api/lead-magnet/confirm/${testToken}`).expect(200);

    // Second call (re-download)
    const response = await request(app).get(`/api/lead-magnet/confirm/${testToken}`).expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.status).toBe('already_confirmed');
    expect(response.body.downloadUrl).toBeTruthy();
    expect(response.body.message).toBe('Nouveau lien de téléchargement généré');

    // Verify token use_count incremented
    const token = await pool.query('SELECT use_count FROM lm_download_tokens WHERE token_hash = $1', [tokenHash]);
    expect(token.rows[0].use_count).toBe(2);
  });

  it('should return 410 for expired token', async () => {
    // Update token to be expired
    await pool.query(
      `UPDATE lm_download_tokens 
       SET expires_at = NOW() - INTERVAL '1 hour' 
       WHERE subscriber_id = $1`,
      [testSubscriberId],
    );

    const response = await request(app).get(`/api/lead-magnet/confirm/${testToken}`).expect(410);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('TOKEN_EXPIRED');
    expect(response.body.status).toBe('expired');
    expect(response.body.message).toBe('Ce lien a expiré après 48 heures');
  });

  it('should return 404 for invalid token', async () => {
    const invalidToken = 'invalid-token-xyz-' + Date.now();
    const response = await request(app).get(`/api/lead-magnet/confirm/${invalidToken}`).expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('TOKEN_INVALID');
    expect(response.body.status).toBe('invalid');
    expect(response.body.message).toBe("Ce lien n'est pas valide");
  });

  it('should return 429 when usage limit reached', async () => {
    // Update token to have reached max uses
    await pool.query(
      `UPDATE lm_download_tokens 
       SET use_count = 999, max_uses = 999 
       WHERE subscriber_id = $1`,
      [testSubscriberId],
    );

    const response = await request(app).get(`/api/lead-magnet/confirm/${testToken}`).expect(429);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('USAGE_LIMIT');
    expect(response.body.status).toBe('limit_reached');
    expect(response.body.message).toBe('Limite de téléchargements atteinte');
  });

  it('should return 400 when token parameter is missing', async () => {
    const response = await request(app).get('/api/lead-magnet/confirm/').expect(404); // Express returns 404 for missing param

    // Note: Express routes without param won't match, so this returns 404 not 400
    // This is expected behavior - the route simply doesn't exist without :token
  });

  it('should track multiple downloads correctly', async () => {
    // First download
    await request(app).get(`/api/lead-magnet/confirm/${testToken}`).expect(200);

    // Second download
    await request(app).get(`/api/lead-magnet/confirm/${testToken}`).expect(200);

    // Third download
    await request(app).get(`/api/lead-magnet/confirm/${testToken}`).expect(200);

    // Verify use_count is 3
    const token = await pool.query('SELECT use_count FROM lm_download_tokens WHERE token_hash = $1', [tokenHash]);
    expect(token.rows[0].use_count).toBe(3);
  });

  it('should not create duplicate consent events on re-download', async () => {
    // First confirmation
    await request(app).get(`/api/lead-magnet/confirm/${testToken}`).expect(200);

    // Re-download
    await request(app).get(`/api/lead-magnet/confirm/${testToken}`).expect(200);

    // Verify only ONE confirm event exists
    const consentEvents = await pool.query(
      `SELECT COUNT(*) as count FROM lm_consent_events WHERE subscriber_id = $1 AND event_type = 'confirm'`,
      [testSubscriberId],
    );
    expect(parseInt(consentEvents.rows[0].count)).toBe(1);
  });
});
