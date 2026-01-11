/**
 * User session stored in Redis
 */
export interface UserSession {
  /** Cognito user UUID */
  cognitoSub: string;
  /** Organisation ID for multi-tenant isolation */
  organisationId: string;
  /** User role (admin, user, viewer) */
  role: string;
  /** User email address */
  email: string;
  /** Cognito groups the user belongs to */
  cognitoGroups: string[];
  /** Last activity timestamp (Unix milliseconds) */
  lastActivity: number;
  /** Session creation timestamp (Unix milliseconds) */
  createdAt: number;
  /** Client IP address (for audit trail) */
  ipAddress?: string;
  /** Client user agent (for device tracking) */
  userAgent?: string;
}

/**
 * Payload for creating a new session
 */
export interface CreateSessionPayload {
  cognitoSub: string;
  organisationId: string;
  role: string;
  email: string;
  cognitoGroups: string[];
  ipAddress?: string;
  userAgent?: string;
}
