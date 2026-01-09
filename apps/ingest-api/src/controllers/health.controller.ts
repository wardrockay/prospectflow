import { Request, Response, NextFunction } from 'express';
import { HealthService } from '../services/health.service.js';
import { BaseController } from './base.controller.js';

/**
 * Health Controller for health check endpoints
 */
export class HealthController extends BaseController {
  constructor(private readonly healthService: HealthService) {
    super();
  }

  /**
   * Health check endpoint handler
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function for error handling
   * @returns Promise<void>
   */
  async check(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.healthService.check();
      this.sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}
