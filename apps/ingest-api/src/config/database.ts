import { Pool, PoolClient } from 'pg';
import { createChildLogger } from '../utils/logger.js';
import { env } from './env.js';

const logger = createChildLogger('Database');

let pool: Pool | null = null;

/**
 * Direct export of pool for server shutdown
 */
export { pool };

/**
 * Récupère ou crée le pool de connexions PostgreSQL
 */
export const getPool = (): Pool => {
  if (!pool) {
    pool = new Pool({
      host: env.postgres.host,
      port: env.postgres.port,
      user: env.postgres.user,
      password: env.postgres.password,
      database: env.postgres.database,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      logger.error({ err }, 'Unexpected error on PostgreSQL client');
    });

    pool.on('connect', () => {
      logger.info('PostgreSQL pool connected');
    });

    logger.info('PostgreSQL pool created');
  }

  return pool;
};

/**
 * Obtient une connexion du pool
 */
export const getClient = async (): Promise<PoolClient> => {
  const pool = getPool();
  return pool.connect();
};

/**
 * Ferme le pool de connexions
 */
export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('PostgreSQL pool closed');
  }
};
