import { createChildLogger } from '../utils/logger.js';
import { leadMagnetRepository } from '../repositories/lead-magnet.repository.js';
import { sendConfirmationEmail } from './email.service.js';
import { generateToken } from '../utils/token.utils.js';

const logger = createChildLogger('LeadMagnetService');

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
}

export const leadMagnetService = new LeadMagnetService();
