import { createChildLogger, timeOperation } from '../utils/logger.js';
import { getPool } from '../config/database.js';
import { DatabaseError } from '../errors/DatabaseError.js';
import type { Pool, PoolClient } from 'pg';

const logger = createChildLogger('LeadMagnetRepository');

export interface LmSubscriber {
  id: string;
  email: string;
  status: 'pending' | 'confirmed' | 'unsubscribed' | 'bounced';
  source: string;
  tags?: Record<string, unknown>;
  created_at: Date;
  confirmed_at?: Date;
  unsubscribed_at?: Date;
  last_email_sent_at?: Date;
}

export interface LmConsentEvent {
  id: string;
  subscriber_id: string;
  event_type: 'signup' | 'confirm' | 'unsubscribe';
  consent_text?: string;
  privacy_policy_version?: string;
  ip?: string;
  user_agent?: string;
  occurred_at: Date;
}

export interface LmDownloadToken {
  id: string;
  subscriber_id: string;
  token_hash: string;
  purpose: 'confirm_and_download' | 'download_only';
  expires_at: Date;
  max_uses: number;
  use_count: number;
  used_at?: Date;
  created_at: Date;
}

/**
 * Repository for B2C Lead Magnet operations
 * Note: These tables are in the public schema with 'lm_' prefix
 * and do NOT require organisation_id filtering
 */
class LeadMagnetRepository {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  /**
   * Find subscriber by email (case-insensitive)
   */
  async findSubscriberByEmail(email: string): Promise<LmSubscriber | null> {
    logger.debug({ email: email.substring(0, 3) + '***' }, 'Finding subscriber by email');

    try {
      const result = await timeOperation(logger, 'db.lm_subscribers.findByEmail', async () => {
        return this.pool.query<LmSubscriber>(
          `SELECT * FROM lm_subscribers WHERE LOWER(email) = LOWER($1)`,
          [email],
        );
      });

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error({ err: error }, 'Failed to find subscriber by email');
      throw new DatabaseError('Failed to find subscriber');
    }
  }

  /**
   * Check if subscriber has an unexpired token
   */
  async checkUnexpiredToken(subscriberId: string): Promise<boolean> {
    logger.debug({ subscriberId }, 'Checking for unexpired token');

    try {
      const result = await timeOperation(logger, 'db.lm_download_tokens.checkUnexpired', async () => {
        return this.pool.query<{ count: string }>(
          `SELECT COUNT(*) as count 
           FROM lm_download_tokens 
           WHERE subscriber_id = $1 
             AND expires_at > NOW() 
             AND use_count < max_uses`,
          [subscriberId],
        );
      });

      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      logger.error({ err: error, subscriberId }, 'Failed to check unexpired token');
      throw new DatabaseError('Failed to check token');
    }
  }

  /**
   * Create token for existing pending subscriber
   */
  async createTokenForExistingSubscriber(
    subscriberId: string,
    tokenHash: string,
  ): Promise<void> {
    logger.info({ subscriberId }, 'Creating new token for existing subscriber');

    try {
      await timeOperation(logger, 'db.lm_download_tokens.create', async () => {
        return this.pool.query(
          `INSERT INTO lm_download_tokens 
           (subscriber_id, token_hash, purpose, expires_at, max_uses, created_at)
           VALUES ($1, $2, $3, NOW() + INTERVAL '48 hours', 999, NOW())`,
          [subscriberId, tokenHash, 'confirm_and_download'],
        );
      });

      logger.info({ subscriberId }, 'Token created for existing subscriber');
    } catch (error) {
      logger.error({ err: error, subscriberId }, 'Failed to create token for existing subscriber');
      throw new DatabaseError('Failed to create token');
    }
  }

  /**
   * Create new subscriber with consent event and download token (atomic transaction)
   */
  async createSubscriberWithToken(
    email: string,
    tokenHash: string,
    consentText: string,
    ipAddress: string,
    userAgent: string,
    source: string = 'landing_page',
  ): Promise<string> {
    const client: PoolClient = await this.pool.connect();

    logger.info({ email: email.substring(0, 3) + '***', source }, 'Creating new subscriber');

    try {
      await client.query('BEGIN');

      // Step 1: Insert subscriber
      const subscriberResult = await client.query<{ id: string }>(
        `INSERT INTO lm_subscribers (email, status, source, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id`,
        [email.toLowerCase().trim(), 'pending', source],
      );
      const subscriberId = subscriberResult.rows[0].id;

      logger.info({ subscriberId }, 'Subscriber created');

      // Step 2: Insert consent event
      await client.query(
        `INSERT INTO lm_consent_events 
         (subscriber_id, event_type, consent_text, privacy_policy_version, ip, user_agent, occurred_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [subscriberId, 'signup', consentText, '2026-02-01', ipAddress, userAgent],
      );

      logger.debug({ subscriberId }, 'Consent event created');

      // Step 3: Insert download token
      await client.query(
        `INSERT INTO lm_download_tokens 
         (subscriber_id, token_hash, purpose, expires_at, max_uses, created_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '48 hours', 999, NOW())`,
        [subscriberId, tokenHash, 'confirm_and_download'],
      );

      logger.debug({ subscriberId }, 'Download token created');

      await client.query('COMMIT');
      logger.info({ subscriberId }, 'Transaction committed successfully');

      return subscriberId;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ err: error }, 'Transaction rolled back');
      throw new DatabaseError('Failed to create subscriber with token');
    } finally {
      client.release();
    }
  }

  /**
   * Check rate limiting: count signup events in last 7 days
   */
  async getSignupCountLast7Days(email: string): Promise<number> {
    logger.debug({ email: email.substring(0, 3) + '***' }, 'Checking rate limit');

    try {
      const result = await timeOperation(logger, 'db.lm_consent_events.countSignups', async () => {
        return this.pool.query<{ count: string }>(
          `SELECT COUNT(*) as count
           FROM lm_consent_events ce
           JOIN lm_subscribers s ON ce.subscriber_id = s.id
           WHERE LOWER(s.email) = LOWER($1)
             AND ce.event_type = 'signup'
             AND ce.occurred_at > NOW() - INTERVAL '7 days'`,
          [email],
        );
      });

      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error({ err: error }, 'Failed to check rate limit');
      throw new DatabaseError('Failed to check rate limit');
    }
  }
}

export const leadMagnetRepository = new LeadMagnetRepository();
