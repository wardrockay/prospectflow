import type { Request, Response } from 'express';
import { createChildLogger } from '../utils/logger.js';
import { getLeadMagnetRepository } from '../repositories/lead-magnet.repository.js';
import { createHmac } from 'crypto';
import { env } from '../config/env.js';

const logger = createChildLogger('LeadMagnetUnsubscribeController');
const leadMagnetRepository = getLeadMagnetRepository();

/**
 * Generate unsubscribe token from subscriber ID
 * Format: {subscriberId}.{signature}
 */
function generateUnsubscribeToken(subscriberId: string): string {
  // Use AWS secret or fallback - this is secure enough for unsubscribe tokens
  const secret = env.leadMagnet.awsSecretAccessKey || process.env.POSTGRES_PASSWORD || 'fallback-unsubscribe-secret';
  const signature = createHmac('sha256', secret)
    .update(subscriberId)
    .digest('base64url');
  
  return `${subscriberId}.${signature}`;
}

/**
 * Verify and extract subscriber ID from unsubscribe token
 */
function verifyUnsubscribeToken(token: string): string | null {
  try {
    const [subscriberId, providedSignature] = token.split('.');
    
    if (!subscriberId || !providedSignature) {
      return null;
    }
    
    const secret = env.leadMagnet.awsSecretAccessKey || process.env.POSTGRES_PASSWORD || 'fallback-unsubscribe-secret';
    const expectedSignature = createHmac('sha256', secret)
      .update(subscriberId)
      .digest('base64url');
    
    if (expectedSignature !== providedSignature) {
      logger.warn({ subscriberId }, 'Invalid unsubscribe token signature');
      return null;
    }
    
    return subscriberId;
  } catch (error) {
    logger.error({ err: error }, 'Failed to verify unsubscribe token');
    return null;
  }
}

/**
 * GET /api/lead-magnet/unsubscribe?token=xxx
 * Unsubscribe a subscriber from all emails
 */
export async function handleUnsubscribe(req: Request, res: Response): Promise<void> {
  const { token } = req.query;
  
  if (!token || typeof token !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Token manquant',
    });
    return;
  }
  
  logger.info('Processing unsubscribe request');
  
  try {
    // Verify token and extract subscriber ID
    const subscriberId = verifyUnsubscribeToken(token);
    
    if (!subscriberId) {
      res.status(400).json({
        success: false,
        error: 'Token invalide ou expiré',
      });
      return;
    }
    
    // Get subscriber details
    const subscriber = await leadMagnetRepository.findSubscriberById(subscriberId);
    
    if (!subscriber) {
      res.status(404).json({
        success: false,
        error: 'Abonné introuvable',
      });
      return;
    }
    
    // Check if already unsubscribed
    if (subscriber.status === 'unsubscribed') {
      logger.info({ subscriberId }, 'Subscriber already unsubscribed');
      res.status(200).json({
        success: true,
        message: 'Vous êtes déjà désinscrit(e)',
        email: subscriber.email,
      });
      return;
    }
    
    // Unsubscribe the subscriber
    await leadMagnetRepository.unsubscribeSubscriber(subscriberId, req.ip, req.get('user-agent'));
    
    logger.info({ subscriberId, email: subscriber.email.substring(0, 3) + '***' }, 'Subscriber unsubscribed successfully');
    
    res.status(200).json({
      success: true,
      message: 'Vous avez été désinscrit(e) avec succès',
      email: subscriber.email,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to process unsubscribe');
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la désinscription',
    });
  }
}

/**
 * Export helper function for generating unsubscribe URLs
 */
export { generateUnsubscribeToken };
