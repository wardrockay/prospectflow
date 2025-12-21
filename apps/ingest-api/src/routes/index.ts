import { Router } from 'express';
import ingestRouter from './ingest.route.js';

const router = Router();

// Monter les routes
router.use('/ingest', ingestRouter);

export default router;
