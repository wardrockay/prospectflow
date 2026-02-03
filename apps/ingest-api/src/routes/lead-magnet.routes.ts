import { Router } from 'express';
import * as leadMagnetController from '../controllers/lead-magnet.controller.js';
import * as leadMagnetUnsubscribeController from '../controllers/lead-magnet-unsubscribe.controller.js';
import { leadMagnetIpRateLimit } from '../middlewares/rate-limit.middleware.js';

const router = Router();

/**
 * POST /api/lead-magnet/signup
 * Email capture and double opt-in flow
 * AC6.1: Apply IP rate limiting middleware before controller
 */
router.post('/signup', leadMagnetIpRateLimit, leadMagnetController.signup);

/**
 * GET /api/lead-magnet/confirm/:token
 * Confirm email and return download URL (JSON response)
 */
router.get('/confirm/:token', leadMagnetController.confirmToken);

/**
 * GET /api/lead-magnet/unsubscribe?token=xxx
 * Unsubscribe a subscriber from all emails
 */
router.get('/unsubscribe', leadMagnetUnsubscribeController.handleUnsubscribe);

export default router;
