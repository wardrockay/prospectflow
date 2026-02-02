import crypto from 'crypto';

/**
 * Generate a cryptographically secure random token
 * @returns Object with plain token and its SHA-256 hash
 */
export function generateToken(): { token: string; hash: string } {
  // Generate 32 random bytes
  const plainToken = crypto.randomBytes(32).toString('base64url');
  
  // Create SHA-256 hash for storage
  const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');
  
  return {
    token: plainToken,
    hash: tokenHash,
  };
}

/**
 * Hash a plain token using SHA-256
 * @param token Plain token to hash
 * @returns SHA-256 hex hash
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify a plain token against a stored hash
 * @param token Plain token to verify
 * @param hash Stored hash to compare against
 * @returns True if token matches hash
 */
export function verifyToken(token: string, hash: string): boolean {
  const computedHash = hashToken(token);
  return computedHash === hash;
}
