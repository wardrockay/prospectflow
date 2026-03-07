import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { sendOnboardingEmailHandler } from '../controllers/onboarding.controller.js';

const router = Router();

router.use(authenticateJWT);

router.post('/send-email', sendOnboardingEmailHandler);

export default router;
