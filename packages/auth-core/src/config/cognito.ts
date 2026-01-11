/**
 * Cognito configuration options
 */
export interface CognitoConfigOptions {
  /** AWS region (default: from AWS_REGION env or 'eu-west-1') */
  region?: string;
  /** Cognito User Pool ID */
  userPoolId: string;
  /** Cognito App Client ID */
  clientId: string;
  /** Cognito issuer URL (optional, derived from userPoolId if not provided) */
  issuer?: string;
}

/**
 * Create a Cognito configuration object
 * @param options - Configuration options (can use env vars as defaults)
 * @returns Complete Cognito configuration
 */
export const createCognitoConfig = (options: CognitoConfigOptions) => {
  const region = options.region || process.env.AWS_REGION || 'eu-west-1';
  const userPoolId = options.userPoolId;

  return {
    region,
    userPoolId,
    clientId: options.clientId,
    issuer:
      options.issuer ||
      process.env.COGNITO_ISSUER ||
      `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
  };
};

/**
 * Default Cognito configuration using environment variables
 * @throws Error if required env vars are not set
 */
export const cognitoConfig = createCognitoConfig({
  userPoolId: process.env.COGNITO_USER_POOL_ID || '',
  clientId: process.env.COGNITO_CLIENT_ID || '',
});
