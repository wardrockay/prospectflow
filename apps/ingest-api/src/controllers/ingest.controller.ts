import { Request, Response, NextFunction } from 'express';
import { ingestService } from '../services/ingest.service.js';
import { ingestSchema } from '../schemas/ingest.schema.js';
import { logger } from '../utils/logger.js';

/**
 * Controller pour gérer les endpoints d'ingestion
 */
export class IngestController {
  /**
   * POST /ingest - Créer une nouvelle ingestion
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validation des données avec Zod
      const validatedData = ingestSchema.parse(req.body);

      // Traitement via le service
      const result = await ingestService.processIngest(validatedData);

      logger.info({ id: result.id }, 'Ingest created successfully');
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const ingestController = new IngestController();
