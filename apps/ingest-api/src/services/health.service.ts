import { HealthRepository } from '../repositories/health.repository.js';
import { BaseService } from './base.service.js';
import { HealthCheckResponse } from '../schemas/health.schema.js';

/**
 * Health Service for performing health checks
 */
export class HealthService extends BaseService {
  constructor(private readonly healthRepository: HealthRepository) {
    super();
  }

  /**
   * Perform comprehensive health check including database connectivity
   * @returns Promise<HealthCheckResponse> Health status with timestamp and database info
   * @throws {DatabaseError} If unable to connect to database
   */
  async check(): Promise<HealthCheckResponse> {
    this.logEvent('Performing health check');

    const dbStatus = await this.healthRepository.checkConnection();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbStatus,
    };
  }
}
