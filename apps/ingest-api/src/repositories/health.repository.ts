import { Pool } from 'pg';
import { BaseRepository } from './base.repository.js';

/**
 * Health Repository for database health checks
 */
export class HealthRepository extends BaseRepository {
  constructor(pool: Pool) {
    super(pool);
  }

  // checkConnection is inherited from BaseRepository
}
