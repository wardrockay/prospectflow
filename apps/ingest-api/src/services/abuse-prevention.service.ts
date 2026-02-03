import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { createChildLogger } from '../utils/logger.js';
import {
  leadMagnetHoneypotDetectionsTotal,
  leadMagnetTurnstileFailuresTotal,
  leadMagnetDisposableEmailBlocksTotal,
} from '../config/metrics.js';

const logger = createChildLogger('abuse-prevention');

// Load disposable domains from JSON file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const disposableDomainsPath = path.join(__dirname, '../data/disposable-domains.json');
const disposableDomains = JSON.parse(readFileSync(disposableDomainsPath, 'utf-8')) as string[];

// Convert to Set for O(1) lookup
const disposableDomainsSet = new Set<string>(disposableDomains);

interface AbuseCheckResult {
  allowed: boolean;
  reason?: string;
  code?: string;
}

/**
 * Check honeypot field (bots fill hidden fields)
 * AC6.4: Reject if honeypot field has any value
 */
export function checkHoneypot(websiteField: string | undefined): AbuseCheckResult {
  if (websiteField && websiteField.trim() !== '') {
    // AC6.9: Increment Prometheus metric
    leadMagnetHoneypotDetectionsTotal.inc();

    // AC6.8: Structured logging
    logger.warn({ honeypotValue: websiteField.substring(0, 20) }, 'Honeypot triggered');

    return { allowed: false, reason: 'honeypot', code: 'BOT_DETECTED' };
  }
  return { allowed: true };
}

/**
 * Check if email domain is disposable
 * AC6.7: Block disposable emails if enabled
 */
export function checkDisposableEmail(email: string): AbuseCheckResult {
  const blockDisposable = process.env.BLOCK_DISPOSABLE_EMAILS === 'true';

  if (!blockDisposable) {
    return { allowed: true };
  }

  const domain = email.split('@')[1]?.toLowerCase();

  if (!domain) {
    return { allowed: true }; // Invalid email handled elsewhere
  }

  if (disposableDomainsSet.has(domain)) {
    // AC6.9: Increment Prometheus metric
    leadMagnetDisposableEmailBlocksTotal.inc();

    // AC6.8: Structured logging
    logger.info({ domain }, 'Disposable email domain blocked');

    return {
      allowed: false,
      reason: 'disposable_email',
      code: 'DISPOSABLE_EMAIL_BLOCKED',
    };
  }

  return { allowed: true };
}

/**
 * Validate Cloudflare Turnstile token
 * AC6.5: Server-side validation against Cloudflare API
 * AC6.6: Fail-open on timeout to avoid blocking legitimate users
 */
export async function validateTurnstile(
  token: string | undefined,
  ip: string,
): Promise<AbuseCheckResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // Skip if not configured (optional feature)
  if (!secretKey) {
    return { allowed: true };
  }

  if (!token) {
    logger.warn({ ip }, 'Turnstile token missing');
    return {
      allowed: false,
      reason: 'turnstile_missing',
      code: 'CAPTCHA_REQUIRED',
    };
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        remoteip: ip,
      }),
    });

    // Fail-open on timeout (don't block legitimate users)
    if (!response.ok) {
      logger.warn({ status: response.status }, 'Turnstile API error, allowing request');
      return { allowed: true };
    }

    const data = (await response.json()) as { success: boolean; 'error-codes'?: string[] };

    if (!data.success) {
      // AC6.9: Increment Prometheus metric
      leadMagnetTurnstileFailuresTotal.inc();

      // AC6.8: Structured logging
      logger.warn({ ip, errors: data['error-codes'] }, 'Turnstile validation failed');

      return {
        allowed: false,
        reason: 'turnstile_invalid',
        code: 'CAPTCHA_INVALID',
      };
    }

    return { allowed: true };
  } catch (error) {
    // Fail-open: don't block users on Cloudflare API issues
    logger.error({ err: error }, 'Turnstile API exception, allowing request');
    return { allowed: true };
  }
}
