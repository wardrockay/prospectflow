import { Router } from 'express';
import { createHealthRoutes } from './health.routes.js';
import { getPool } from '../config/database.js';
import { campaignRoutes } from './campaign.routes.js';
import { cognitoAuthMiddleware, sessionMiddleware, organisationScopeMiddleware } from '../config/auth-middlewares.js';

const router = Router();

// Mount health routes with dependency injection
const pool = getPool();
router.use(createHealthRoutes(pool));

// Campaign routes - Protected by authentication, session, and organisation scope
// Middleware chain: cognitoAuth -> session -> organisationScope
router.use('/campaigns', cognitoAuthMiddleware, sessionMiddleware(), organisationScopeMiddleware, campaignRoutes);

export default router;
