import { dbQueryDuration, dbConnectionPool } from '../config/metrics.js';
import { createChildLogger } from './logger.js';

const logger = createChildLogger('DatabaseMetrics');

/**
 * Track database query duration
 * @param operation - Type of query (SELECT, INSERT, UPDATE, DELETE)
 * @param schema - Database schema (iam, crm, outreach, tracking)
 * @param fn - Async function executing the query
 * @returns Query result
 *
 * @example
 * const users = await trackDatabaseQuery('SELECT', 'iam', async () => {
 *   return await db.query('SELECT * FROM iam.users WHERE organisation_id = $1', [orgId]);
 * });
 */
export const trackDatabaseQuery = async <T>(
  operation: string,
  schema: string,
  fn: () => Promise<T>,
): Promise<T> => {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = (Date.now() - start) / 1000;
    dbQueryDuration.observe({ operation, schema }, duration);

    if (duration > 0.1) {
      logger.warn({ operation, schema, duration }, 'Slow database query detected');
    }

    return result;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    dbQueryDuration.observe({ operation, schema }, duration);
    throw error;
  }
};

/**
 * Update database connection pool metrics
 * Call this periodically or on pool events
 * @param activeConnections - Number of active connections
 * @param idleConnections - Number of idle connections
 */
export const updateConnectionPoolMetrics = (
  activeConnections: number,
  idleConnections: number,
): void => {
  dbConnectionPool.set({ state: 'active' }, activeConnections);
  dbConnectionPool.set({ state: 'idle' }, idleConnections);
};
