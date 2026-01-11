// Frontend-safe type re-exports (no Node.js dependencies)

/**
 * Frontend-safe user representation
 */
export interface AuthUser {
  sub: string;
  email: string;
  organisationId: string;
  role: string;
  groups: string[];
}

/**
 * Frontend-safe session representation
 */
export interface AuthSession {
  user: AuthUser;
  expiresAt: number;
}

// Re-export types that are safe for frontend
export type { CognitoJwtPayload } from '../types/cognito.js';
export type { UserSession } from '../types/session.js';
