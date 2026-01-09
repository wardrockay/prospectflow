import { Pool } from 'pg';
import { logger } from '../utils/logger.js';
import { DatabaseError } from '../errors/DatabaseError.js';

/**
 * Base Repository class with common database operations
 */
export class BaseRepository {
  constructor(protected pool: Pool) {}

  /**
   * Execute a query safely with error handling
   */
  protected async query(text: string, params?: any[]) {
    try {
      const result = await this.pool.query(text, params);
      return result;
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          query: text,
        },
        'Database query error',
      );
      throw new DatabaseError(error instanceof Error ? error.message : 'Database operation failed');
    }
  }

  /**
   * Check database connection
   */
  async checkConnection(): Promise<{ connected: boolean; latency: number }> {
    const start = Date.now();
    try {
      await this.pool.query('SELECT 1');
      const latency = Date.now() - start;
      return { connected: true, latency };
    } catch (error) {
      logger.error({ error }, 'Database connection check failed');
      throw new DatabaseError('Unable to connect to database');
    }
  }
}
