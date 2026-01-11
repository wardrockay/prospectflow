/**
 * Cognito JWT Payload structure
 * This represents the decoded payload from a Cognito ID token
 */
export interface CognitoJwtPayload {
  /** Cognito user UUID (subject) */
  sub: string;
  /** User email address */
  email: string;
  /** Cognito groups the user belongs to (admin, user, viewer) */
  'cognito:groups'?: string[];
  /** Custom attribute: Organisation ID for multi-tenant isolation */
  'custom:organisation_id'?: string;
  /** Custom attribute: User role within the organisation */
  'custom:role'?: string;
  /** Token use type: 'access' for access tokens, 'id' for ID tokens */
  token_use: 'access' | 'id';
  /** Issuer URL (Cognito User Pool URL) */
  iss: string;
  /** Expiration timestamp (Unix epoch) */
  exp: number;
  /** Issued at timestamp (Unix epoch) */
  iat: number;
}
