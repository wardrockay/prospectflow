import { Router } from 'express';
import { Pool } from 'pg';
import { HealthController } from '../controllers/health.controller.js';
import { HealthService } from '../services/health.service.js';
import { HealthRepository } from '../repositories/health.repository.js';

/**
 * Create health routes with dependency injection
 */
export function createHealthRoutes(pool: Pool): Router {
  const router = Router();

  // Dependency injection chain
  const healthRepository = new HealthRepository(pool);
  const healthService = new HealthService(healthRepository);
  const healthController = new HealthController(healthService);

  router.get('/health', healthController.check.bind(healthController));

  return router;
}
