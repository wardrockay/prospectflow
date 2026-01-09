export interface CognitoJwtPayload {
  sub: string; // Cognito user UUID
  email: string;
  'cognito:groups'?: string[]; // admin, user, viewer
  'custom:organisation_id'?: string;
  'custom:role'?: string;
  token_use: 'access' | 'id';
  iss: string;
  exp: number;
  iat: number;
}
