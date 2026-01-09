export const cognitoConfig = {
  region: process.env.AWS_REGION || 'eu-west-1',
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  clientId: process.env.COGNITO_CLIENT_ID!,
  issuer: process.env.COGNITO_ISSUER!,
};
