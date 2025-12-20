import * as dotenv from 'dotenv';
import * as path from 'path';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charge dynamiquement le bon .env selon NODE_ENV
const envFile = `.env.${process.env.NODE_ENV ?? 'dev'}`;
dotenv.config({ path: path.resolve(__dirname, '../../env/', envFile) });

// Fonction utilitaire pour s'assurer que les variables existent
function getEnvVar(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// Export des variables typées
export const env = {
  node_env: process.env.NODE_ENV,
  port: getEnvVar('PORT', '3000'),
  logLevel: getEnvVar('LOG_LEVEL', 'debug'),
  corsOrigin: getEnvVar('CORS_ORIGIN', 'http://localhost:3000'),
};
