import { Router } from 'express';
import { createHealthRoutes } from './health.routes.js';
import { getPool } from '../config/database.js';
import { campaignRoutes } from './campaign.routes.js';
import { cognitoAuthMiddleware, organisationScopeMiddleware } from '../config/auth-middlewares.js';

const router = Router();

// Mount health routes with dependency injection
const pool = getPool();
router.use(createHealthRoutes(pool));

// Campaign routes - Protected by authentication and organisation scope
router.use('/campaigns', cognitoAuthMiddleware, organisationScopeMiddleware, campaignRoutes);

export default router;
