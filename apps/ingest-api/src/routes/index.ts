import { Router } from 'express';
import ingestRouter from './ingest.route.js';
import { createHealthRoutes } from './health.routes.js';
import authTestRouter from './auth.test.routes.js';
import authRouter from './auth.routes.js';
import { getPool } from '../config/database.js';

const router = Router();

// Mount health routes with dependency injection
const pool = getPool();
router.use(createHealthRoutes(pool));

// Mount auth routes (OAuth callbacks, logout, user info)
router.use('/auth', authRouter);

// Mount auth test routes (for smoke testing JWT validation)
router.use('/auth', authTestRouter);

// Monter les routes
router.use('/ingest', ingestRouter);

export default router;
