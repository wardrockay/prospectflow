/**
 * Prospects Routes - Define API routes for prospect management
 */
import { Router } from 'express';
import { prospectsController } from '../controllers/prospects.controller.js';
import { uploadCsv } from '../middlewares/upload.middleware.js';
import {
  cognitoAuthMiddleware,
  sessionMiddleware,
  organisationScopeMiddleware,
} from '../config/auth-middlewares.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('ProspectsRoutes');
const router = Router();

// Apply authentication middleware chain to all prospects routes
router.use(cognitoAuthMiddleware, sessionMiddleware(), organisationScopeMiddleware);

/**
 * POST /api/v1/campaigns/:campaignId/prospects/upload
 * Upload CSV file for prospect import
 */
router.post('/campaigns/:campaignId/prospects/upload', uploadCsv.single('file'), (req, res, next) =>
  prospectsController.uploadCsv(req, res, next),
);

/**
 * GET /api/v1/campaigns/prospects/template
 * Download CSV template
 */
router.get('/campaigns/prospects/template', (req, res, next) =>
  prospectsController.downloadTemplate(req, res, next),
);

/**
 * GET /api/v1/imports/:uploadId/columns
 * Get detected columns and suggested mappings
 */
router.get('/imports/:uploadId/columns', (req, res, next) =>
  prospectsController.getColumns(req, res, next),
);

/**
 * POST /api/v1/imports/:uploadId/parse
 * Parse CSV with user-confirmed column mappings
 */
router.post('/imports/:uploadId/parse', (req, res, next) =>
  prospectsController.parseCsv(req, res, next),
);

logger.info('Prospects routes configured');

export default router;
