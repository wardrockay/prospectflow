import { Router } from 'express';
import { ingestController } from '../controllers/ingest.controller.js';

const router = Router();

/**
 * POST /ingest - Créer une nouvelle ingestion depuis Pharrow
 */
router.post('/', (req, res, next) => ingestController.create(req, res, next));

export default router;
