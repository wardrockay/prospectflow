import { Router } from 'express';
import * as leadMagnetController from '../controllers/lead-magnet.controller.js';

const router = Router();

/**
 * POST /api/lead-magnet/signup
 * Email capture and double opt-in flow
 */
router.post('/signup', leadMagnetController.signup);

export default router;
