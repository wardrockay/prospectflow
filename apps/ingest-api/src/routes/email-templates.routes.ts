import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import * as emailTemplatesController from '../controllers/email-templates.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticateJWT);

// Email templates CRUD
router.get('/', emailTemplatesController.listTemplates);
router.post('/', emailTemplatesController.createTemplate);
router.post('/preview', emailTemplatesController.previewTemplate);
router.get('/:id', emailTemplatesController.getTemplateById);
router.put('/:id', emailTemplatesController.updateTemplate);
router.delete('/:id', emailTemplatesController.deleteTemplate);

export default router;
