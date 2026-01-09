import { Router } from 'express';
import ingestRouter from './ingest.route.js';
import { createHealthRoutes } from './health.routes.js';
import { getPool } from '../config/database.js';

const router = Router();

// Mount health routes with dependency injection
const pool = getPool();
router.use(createHealthRoutes(pool));

// Monter les routes
router.use('/ingest', ingestRouter);

export default router;
