import { env } from './env.js';

export const cognitoConfig = {
  region: env.cognito.region,
  userPoolId: env.cognito.userPoolId,
  clientId: env.cognito.clientId,
  issuer: env.cognito.issuer,
};
