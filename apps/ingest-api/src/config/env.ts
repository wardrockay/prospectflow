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
};
