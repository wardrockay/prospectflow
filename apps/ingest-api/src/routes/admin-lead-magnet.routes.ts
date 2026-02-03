import { Router } from 'express';
import * as adminLeadMagnetController from '../controllers/admin-lead-magnet.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';

const router = Router();

// All admin routes require authentication
router.use(authenticateJWT);

/**
 * GET /api/admin/lead-magnet/stats?period=7d|30d|90d|all
 * Get analytics statistics for specified period
 */
router.get('/stats', adminLeadMagnetController.getStats);

/**
 * GET /api/admin/lead-magnet/subscribers?page=1&limit=25&search=email&sortBy=created_at&sortOrder=desc
 * List subscribers with pagination, search, and sort
 */
router.get('/subscribers', adminLeadMagnetController.listSubscribers);

/**
 * GET /api/admin/lead-magnet/subscribers/:id
 * Get detailed information about a subscriber
 */
router.get('/subscribers/:id', adminLeadMagnetController.getSubscriberDetail);

/**
 * DELETE /api/admin/lead-magnet/subscribers/:id
 * Delete subscriber and all related data (RGPD compliance)
 */
router.delete('/subscribers/:id', adminLeadMagnetController.deleteSubscriber);

/**
 * GET /api/admin/lead-magnet/subscribers/export?search=email
 * Export subscribers list to CSV
 */
router.get('/subscribers/export', adminLeadMagnetController.exportSubscribers);

export default router;
