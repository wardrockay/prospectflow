/**
 * Email Normalizer Utility
 * Normalizes email addresses for case-insensitive duplicate detection
 */
import { createChildLogger } from './logger.js';

const logger = createChildLogger('EmailNormalizerUtil');

/**
 * Normalizes an email address for duplicate detection
 * - Converts to lowercase
 * - Trims whitespace
 * - Returns empty string for undefined/null values
 *
 * @param email - Email address to normalize
 * @returns Normalized email address in lowercase with whitespace trimmed
 *
 * @example
 * normalizeEmail('John@Example.COM') // returns 'john@example.com'
 * normalizeEmail('  sarah@acme.com  ') // returns 'sarah@acme.com'
 * normalizeEmail(undefined) // returns ''
 */
export function normalizeEmail(email: string | undefined): string {
  if (!email) {
    logger.debug({ email }, 'Normalizing empty or undefined email');
    return '';
  }

  const normalized = email.trim().toLowerCase();

  logger.debug({ original: email, normalized }, 'Email normalized');

  return normalized;
}
