import { HealthRepository } from '../repositories/health.repository.js';
import { BaseService } from './base.service.js';
import { HealthCheckResponse } from '../schemas/health.schema.js';

export class HealthService extends BaseService {
  constructor(private readonly healthRepository: HealthRepository) {
    super();
  }

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
