import * as dotenv from 'dotenv';
import * as path from 'path';
import { z } from 'zod';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charge dynamiquement le bon .env selon NODE_ENV
const envFile = `.env.${process.env.NODE_ENV ?? 'dev'}`;
dotenv.config({ path: path.resolve(__dirname, '../../env/', envFile) });

// Zod schema for environment variables validation
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'dev', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.string().transform(Number).default('5432'),
  POSTGRES_USER: z.string().default('prospectflow'),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_DB: z.string().default('prospectflow'),

  DATABASE_URL: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),

  AWS_REGION: z.string().default('eu-west-1'),
  COGNITO_USER_POOL_ID: z.string(),
  COGNITO_CLIENT_ID: z.string(),
  COGNITO_ISSUER: z.string(),

  // Lead Magnet AWS (SES + S3)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  SES_FROM_EMAIL: z.string().optional(),
  BASE_URL: z.string().optional(),
  S3_BUCKET_NAME: z.string().optional(),
  S3_FILE_KEY: z.string().optional(),

  // Sentry
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.enum(['development', 'staging', 'production']).optional(),
  SENTRY_TRACES_SAMPLE_RATE: z
    .string()
    .transform((v) => {
      const n = Number(v);
      return Number.isNaN(n) ? 0.1 : n;
    })
    .optional(),
  SENTRY_RELEASE: z.string().optional(),
});

// Parse and validate environment variables
const parsedEnv = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  LOG_LEVEL: process.env.LOG_LEVEL,
  CORS_ORIGIN: process.env.CORS_ORIGIN,

  POSTGRES_HOST: process.env.POSTGRES_HOST,
  POSTGRES_PORT: process.env.POSTGRES_PORT,
  POSTGRES_USER: process.env.POSTGRES_USER,
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
  POSTGRES_DB: process.env.POSTGRES_DB,

  DATABASE_URL: process.env.DATABASE_URL,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,

  AWS_REGION: process.env.AWS_REGION,
  COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
  COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
  COGNITO_ISSUER: process.env.COGNITO_ISSUER,

  // Lead Magnet AWS
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  SES_FROM_EMAIL: process.env.SES_FROM_EMAIL,
  BASE_URL: process.env.BASE_URL,
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
  S3_FILE_KEY: process.env.S3_FILE_KEY,

  // Sentry
  SENTRY_DSN: process.env.SENTRY_DSN,
  SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
  SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE,
  SENTRY_RELEASE: process.env.SENTRY_RELEASE,
});

// Export typed environment configuration
export const env = {
  node_env: parsedEnv.NODE_ENV,
  port: parsedEnv.PORT,
  logLevel: parsedEnv.LOG_LEVEL,
  corsOrigin: parsedEnv.CORS_ORIGIN,

  postgres: {
    host: parsedEnv.POSTGRES_HOST,
    port: parsedEnv.POSTGRES_PORT,
    user: parsedEnv.POSTGRES_USER,
    password: parsedEnv.POSTGRES_PASSWORD,
    database: parsedEnv.POSTGRES_DB,
  },

  databaseUrl: parsedEnv.DATABASE_URL,
  allowedOrigins: parsedEnv.ALLOWED_ORIGINS,

  cognito: {
    region: parsedEnv.AWS_REGION,
    userPoolId: parsedEnv.COGNITO_USER_POOL_ID,
    clientId: parsedEnv.COGNITO_CLIENT_ID,
    issuer: parsedEnv.COGNITO_ISSUER,
  },

  // Lead Magnet AWS (SES + S3)
  leadMagnet: {
    awsRegion: parsedEnv.AWS_REGION,
    awsAccessKeyId: parsedEnv.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: parsedEnv.AWS_SECRET_ACCESS_KEY,
    sesFromEmail: parsedEnv.SES_FROM_EMAIL,
    baseUrl: parsedEnv.BASE_URL,
    s3BucketName: parsedEnv.S3_BUCKET_NAME,
    s3FileKey: parsedEnv.S3_FILE_KEY,
  },

  // Sentry configuration
  sentryDsn: parsedEnv.SENTRY_DSN,
  sentryEnvironment: parsedEnv.SENTRY_ENVIRONMENT,
  sentryTracesSampleRate: parsedEnv.SENTRY_TRACES_SAMPLE_RATE ?? 0.1,
  sentryRelease: parsedEnv.SENTRY_RELEASE,
};
