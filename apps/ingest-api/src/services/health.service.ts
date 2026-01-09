import { HealthRepository } from '../repositories/health.repository.js';
import { BaseService } from './base.service.js';
import { HealthCheckResponse } from '../schemas/health.schema.js';
import { rabbitMQClient } from '../queue/rabbitmq.client.js';

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
    const rabbitStatus = await this.checkRabbitMQ();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      rabbitmq: rabbitStatus,
    };
  }

  /**
   * Check RabbitMQ connection status
   * @returns RabbitMQ health status
   */
  private async checkRabbitMQ() {
    try {
      const isConnected = rabbitMQClient.isConnected();
      return {
        connected: isConnected,
        managementUI: `http://localhost:${process.env.RABBITMQ_MANAGEMENT_PORT || '15672'}`,
      };
    } catch (error) {
      return {
        connected: false,
        error: (error as Error).message,
      };
    }
  }
}
