import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import * as nurtureSequencesController from '../controllers/nurture-sequences.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticateJWT);

// Nurture sequences CRUD
router.get('/', nurtureSequencesController.listSequences);
router.post('/', nurtureSequencesController.createSequence);
router.get('/:id', nurtureSequencesController.getSequenceById);
router.put('/:id', nurtureSequencesController.updateSequence);
router.delete('/:id', nurtureSequencesController.deleteSequence);

// Nurture emails within sequences
router.post('/:id/emails', nurtureSequencesController.createEmail);
router.put('/:id/emails/:emailId', nurtureSequencesController.updateEmail);
router.delete('/:id/emails/:emailId', nurtureSequencesController.deleteEmail);

export default router;
