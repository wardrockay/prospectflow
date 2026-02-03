import { Router } from 'express';
import ingestRouter from './ingest.route.js';
import { createHealthRoutes } from './health.routes.js';
import authTestRouter from './auth.test.routes.js';
import authRouter from './auth.routes.js';
import prospectsRouter from './prospects.routes.js';
import leadMagnetRouter from './lead-magnet.routes.js';
import adminLeadMagnetRouter from './admin-lead-magnet.routes.js';
import { getPool } from '../config/database.js';
import testRouter from './test.routes.js';

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
router.use(prospectsRouter);

// Lead magnet public routes (signup, confirm)
router.use('/lead-magnet', leadMagnetRouter);

// Lead magnet admin routes (analytics, subscribers management)
router.use('/admin/lead-magnet', adminLeadMagnetRouter);

// Dev-only test routes for error generation
if (process.env.NODE_ENV !== 'production') {
  router.use('/test', testRouter);
}

export default router;
