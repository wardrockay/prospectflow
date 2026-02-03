import { createChildLogger } from '../utils/logger.js';
import { leadMagnetRepository } from '../repositories/lead-magnet.repository.js';
import { sendConfirmationEmail } from './email.service.js';
import { generateToken, hashToken } from '../utils/token.utils.js';
import { getLeadMagnetDownloadUrl } from '../utils/s3.utils.js';
import { getPool } from '../config/database.js';
import type { PoolClient } from 'pg';

const logger = createChildLogger('lead-magnet-service');

/**
 * Custom error types for lead magnet operations
 */
export class LeadMagnetError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'LeadMagnetError';
  }
}

export interface SignupRequest {
  email: string;
  consentGiven: boolean;
  ipAddress: string;
  userAgent: string;
  source?: string;
}

export interface SignupResponse {
  success: boolean;
  message: string;
}

export interface ConfirmTokenResult {
  success: boolean;
  status: 'confirmed' | 'already_confirmed' | 'expired' | 'invalid' | 'limit_reached' | 'error';
  downloadUrl?: string;
  error?: string;
  message: string;
}

/**
 * Service for Lead Magnet business logic
 */
class LeadMagnetService {
  /**
   * Handle email signup with double opt-in flow
   * Implements all business rules from AC2.4-AC2.12
   */
  async handleSignup(request: SignupRequest): Promise<SignupResponse> {
    const { email, consentGiven, ipAddress, userAgent, source = 'landing_page' } = request;

    logger.info({ email: email.substring(0, 3) + '***', source }, 'Processing signup request');

    // AC2.5: Validate consent
    if (!consentGiven) {
      logger.warn({ email: email.substring(0, 3) + '***' }, 'Consent not given');
      throw new LeadMagnetError(
        'Vous devez accepter de recevoir des emails',
        'CONSENT_REQUIRED',
        400,
      );
    }

    // AC2.5: Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format (basic check, Zod handles detailed validation)
    if (!normalizedEmail.includes('@')) {
      logger.warn({ email: normalizedEmail.substring(0, 3) + '***' }, 'Invalid email format');
      throw new LeadMagnetError('Email invalide', 'INVALID_EMAIL', 400);
    }

    // AC2.8: Check if email already exists FIRST (before rate limiting for better UX)
    const existingSubscriber = await leadMagnetRepository.findSubscriberByEmail(normalizedEmail);

    if (existingSubscriber) {
      const { id: subscriberId, status } = existingSubscriber;

      // SCENARIO C: Already confirmed - show friendly message immediately
      if (status === 'confirmed') {
        logger.info({ subscriberId }, 'Email already confirmed');
        throw new LeadMagnetError(
          'Vous êtes déjà inscrit(e). Vérifiez votre boîte de réception.',
          'ALREADY_SUBSCRIBED',
          400,
        );
      }

      // SCENARIO D: Unsubscribed
      if (status === 'unsubscribed') {
        logger.info({ subscriberId }, 'Email was unsubscribed');
        throw new LeadMagnetError(
          'Cette adresse a été désinscrite. Contactez-nous pour vous réinscrire.',
          'UNSUBSCRIBED',
          400,
        );
      }

      // SCENARIO B: Pending subscriber - check rate limit only for resends
      if (status === 'pending') {
        // AC2.12: Check rate limiting for pending subscribers (max 3 per 7 days)
        const signupCount = await leadMagnetRepository.getSignupCountLast7Days(normalizedEmail);
        if (signupCount >= 3) {
          logger.warn(
            { email: normalizedEmail.substring(0, 3) + '***', signupCount },
            'Rate limit exceeded for pending subscriber',
          );
          throw new LeadMagnetError(
            'Vous avez déjà demandé ce guide récemment. Vérifiez votre boîte de réception ou contactez-nous.',
            'RATE_LIMIT_EXCEEDED',
            429,
          );
        }
        // Check if unexpired token exists
        const hasUnexpiredToken = await leadMagnetRepository.checkUnexpiredToken(subscriberId);

        if (hasUnexpiredToken) {
          // Don't spam user with multiple emails
          logger.info({ subscriberId }, 'Unexpired token exists, not resending');
          return {
            success: true,
            message: 'Email de confirmation déjà envoyé',
          };
        }

        // Token expired, regenerate and resend
        const { token, hash } = generateToken();
        await leadMagnetRepository.createTokenForExistingSubscriber(subscriberId, hash);

        try {
          await sendConfirmationEmail(normalizedEmail, token);
          logger.info({ subscriberId }, 'Token regenerated and email resent');

          return {
            success: true,
            message: 'Email de confirmation renvoyé',
          };
        } catch (error) {
          logger.error({ err: error, subscriberId }, 'Failed to send confirmation email');
          throw new LeadMagnetError(
            "Erreur d'envoi d'email. Réessayez dans quelques instants.",
            'EMAIL_SEND_FAILED',
            500,
          );
        }
      }
    }

    // SCENARIO A: New email (happy path)
    // AC2.12: Check rate limiting for new signups
    const signupCount = await leadMagnetRepository.getSignupCountLast7Days(normalizedEmail);
    if (signupCount >= 3) {
      logger.warn(
        { email: normalizedEmail.substring(0, 3) + '***', signupCount },
        'Rate limit exceeded for new signup',
      );
      throw new LeadMagnetError(
        'Vous avez déjà demandé ce guide récemment. Vérifiez votre boîte de réception ou contactez-nous.',
        'RATE_LIMIT_EXCEEDED',
        429,
      );
    }

    const { token, hash } = generateToken();
    const consentText = "J'accepte de recevoir des emails de Light & Shutter";

    try {
      // AC2.6: Create subscriber with token (atomic transaction)
      const subscriberId = await leadMagnetRepository.createSubscriberWithToken(
        normalizedEmail,
        hash,
        consentText,
        ipAddress,
        userAgent,
        source,
      );

      logger.info({ subscriberId }, 'New subscriber created');

      // AC2.9: Send confirmation email
      await sendConfirmationEmail(normalizedEmail, token);

      logger.info({ subscriberId }, 'Confirmation email sent successfully');

      return {
        success: true,
        message: 'Email envoyé',
      };
    } catch (error) {
      logger.error({ err: error }, 'Failed to create subscriber or send email');

      // Check if it's an email sending error specifically
      if (error instanceof Error && error.message.includes('send')) {
        throw new LeadMagnetError(
          "Erreur d'envoi d'email. Réessayez dans quelques instants.",
          'EMAIL_SEND_FAILED',
          500,
        );
      }

      // Generic database error
      throw new LeadMagnetError(
        'Une erreur est survenue. Veuillez réessayer.',
        'INTERNAL_ERROR',
        500,
      );
    }
  }

  /**
   * Confirm token and generate download URL
   * Implements all business rules from AC3.4-AC3.11
   */
  async confirmToken(
    plainToken: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<ConfirmTokenResult> {
    const tokenHash = hashToken(plainToken);
    const pool = getPool();

    logger.info({ tokenHashPrefix: tokenHash.substring(0, 8) }, 'Processing token confirmation');

    // Step 1: Validate token
    const tokenResult = await pool.query(
      `SELECT dt.id, dt.subscriber_id, dt.expires_at, dt.use_count, dt.max_uses, dt.used_at,
              s.email, s.status
       FROM lm_download_tokens dt
       JOIN lm_subscribers s ON s.id = dt.subscriber_id
       WHERE dt.token_hash = $1 AND dt.purpose = 'confirm_and_download'`,
      [tokenHash],
    );

    if (tokenResult.rows.length === 0) {
      logger.warn({ tokenHashPrefix: tokenHash.substring(0, 8) }, 'Invalid token attempted');
      return {
        success: false,
        status: 'invalid',
        error: 'TOKEN_INVALID',
        message: "Ce lien n'est pas valide",
      };
    }

    const tokenData = tokenResult.rows[0];

    // Step 2: Check expiration (48h from creation)
    if (new Date(tokenData.expires_at) < new Date()) {
      logger.info({ subscriberId: tokenData.subscriber_id }, 'Expired token used');
      return {
        success: false,
        status: 'expired',
        error: 'TOKEN_EXPIRED',
        message: 'Ce lien a expiré après 48 heures',
      };
    }

    // Step 3: Check usage limit (currently 999, effectively unlimited)
    if (tokenData.use_count >= tokenData.max_uses) {
      logger.warn({ subscriberId: tokenData.subscriber_id }, 'Token usage limit reached');
      return {
        success: false,
        status: 'limit_reached',
        error: 'USAGE_LIMIT',
        message: 'Limite de téléchargements atteinte',
      };
    }

    // Step 4: Begin database transaction
    const client: PoolClient = await pool.connect();

    try {
      await client.query('BEGIN');

      const isFirstConfirmation = tokenData.status === 'pending';

      // Step 5: Update subscriber status if pending
      if (isFirstConfirmation) {
        await client.query(
          `UPDATE lm_subscribers 
           SET status = 'confirmed', confirmed_at = NOW()
           WHERE id = $1`,
          [tokenData.subscriber_id],
        );

        // Log consent confirmation event (RGPD audit trail)
        await client.query(
          `INSERT INTO lm_consent_events 
           (subscriber_id, event_type, ip, user_agent, occurred_at)
           VALUES ($1, 'confirm', $2, $3, NOW())`,
          [tokenData.subscriber_id, ipAddress, userAgent],
        );

        logger.info(
          { subscriberId: tokenData.subscriber_id, email: tokenData.email.substring(0, 3) + '***' },
          'Subscriber confirmed',
        );
      }

      // Step 6: Update token usage
      const isFirstDownload = !tokenData.used_at;
      if (isFirstDownload) {
        await client.query(
          `UPDATE lm_download_tokens 
           SET use_count = use_count + 1, used_at = NOW() 
           WHERE id = $1`,
          [tokenData.id],
        );
      } else {
        await client.query(
          `UPDATE lm_download_tokens 
           SET use_count = use_count + 1 
           WHERE id = $1`,
          [tokenData.id],
        );
      }

      await client.query('COMMIT');

      // Step 7: Generate S3 signed URL (after successful DB transaction)
      const downloadUrl = await getLeadMagnetDownloadUrl();

      logger.info(
        {
          subscriberId: tokenData.subscriber_id,
          useCount: tokenData.use_count + 1,
          isFirstConfirmation,
        },
        'Download URL generated',
      );

      return {
        success: true,
        status: isFirstConfirmation ? 'confirmed' : 'already_confirmed',
        downloadUrl,
        message: isFirstConfirmation
          ? 'Email confirmé, téléchargement prêt'
          : 'Nouveau lien de téléchargement généré',
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ error, subscriberId: tokenData.subscriber_id }, 'Transaction failed');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const leadMagnetService = new LeadMagnetService();
