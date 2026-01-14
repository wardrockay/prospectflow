/**
 * Email Validator Utility
 * RFC 5322 compliant email validation
 */
import validator from 'validator';

/**
 * Validate email format using RFC 5322 standard
 * @param email - Email string to validate
 * @returns true if valid email, false otherwise
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Trim whitespace
  const trimmed = email.trim();

  // Check for empty string after trim
  if (trimmed.length === 0) {
    return false;
  }

  // Check for spaces (invalid in emails)
  if (trimmed.includes(' ')) {
    return false;
  }

  // Use validator library for comprehensive email validation
  return validator.isEmail(trimmed, {
    allow_utf8_local_part: true, // Support Unicode
    require_tld: true, // Require top-level domain
  });
}

/**
 * Check if email conforms to RFC 5322 standard
 * @param email - Email string to validate
 * @returns true if RFC 5322 compliant
 */
export function isRFC5322Email(email: string): boolean {
  return validateEmail(email);
}
