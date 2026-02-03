import { Request, Response } from 'express';
import { z } from 'zod';
import * as nurtureSequencesRepository from '../repositories/nurture-sequences.repository.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('NurtureSequencesController');

// Validation schemas
const createSequenceSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional()
});

const updateSequenceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional()
});

const createEmailSchema = z.object({
  template_id: z.string().uuid().optional(),
  order_index: z.number().int().min(0),
  subject: z.string().min(1).max(500),
  delay_days: z.number().int().min(0),
  notes: z.string().optional()
});

const updateEmailSchema = z.object({
  template_id: z.string().uuid().optional().nullable(),
  order_index: z.number().int().min(0).optional(),
  subject: z.string().min(1).max(500).optional(),
  delay_days: z.number().int().min(0).optional(),
  notes: z.string().optional().nullable()
});

/**
 * List all nurture sequences
 */
export async function listSequences(req: Request, res: Response) {
  try {
    const sequences = await nurtureSequencesRepository.listNurtureSequences();
    
    res.json({
      success: true,
      data: sequences
    });
  } catch (error) {
    logger.error({ error }, 'Error listing nurture sequences');
    res.status(500).json({
      success: false,
      error: 'Failed to list nurture sequences'
    });
  }
}

/**
 * Get nurture sequence by ID with emails
 */
export async function getSequenceById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sequence ID format'
      });
    }

    const sequence = await nurtureSequencesRepository.getNurtureSequenceById(id);

    if (!sequence) {
      return res.status(404).json({
        success: false,
        error: 'Nurture sequence not found'
      });
    }

    res.json({
      success: true,
      data: sequence
    });
  } catch (error) {
    logger.error({ error }, 'Error getting nurture sequence');
    res.status(500).json({
      success: false,
      error: 'Failed to get nurture sequence'
    });
  }
}

/**
 * Create new nurture sequence
 */
export async function createSequence(req: Request, res: Response) {
  try {
    const validation = createSequenceSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      });
    }

    const sequence = await nurtureSequencesRepository.createNurtureSequence(validation.data);

    res.status(201).json({
      success: true,
      data: sequence
    });
  } catch (error) {
    logger.error({ error }, 'Error creating nurture sequence');
    res.status(500).json({
      success: false,
      error: 'Failed to create nurture sequence'
    });
  }
}

/**
 * Update nurture sequence
 */
export async function updateSequence(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sequence ID format'
      });
    }

    const validation = updateSequenceSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      });
    }

    const sequence = await nurtureSequencesRepository.updateNurtureSequence(id, validation.data);

    if (!sequence) {
      return res.status(404).json({
        success: false,
        error: 'Nurture sequence not found'
      });
    }

    res.json({
      success: true,
      data: sequence
    });
  } catch (error) {
    logger.error({ error }, 'Error updating nurture sequence');
    res.status(500).json({
      success: false,
      error: 'Failed to update nurture sequence'
    });
  }
}

/**
 * Delete nurture sequence
 */
export async function deleteSequence(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sequence ID format'
      });
    }

    const deleted = await nurtureSequencesRepository.deleteNurtureSequence(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Nurture sequence not found'
      });
    }

    res.json({
      success: true,
      message: 'Nurture sequence deleted'
    });
  } catch (error) {
    logger.error({ error }, 'Error deleting nurture sequence');
    res.status(500).json({
      success: false,
      error: 'Failed to delete nurture sequence'
    });
  }
}

/**
 * Create email in sequence
 */
export async function createEmail(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sequence ID format'
      });
    }

    const validation = createEmailSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      });
    }

    const email = await nurtureSequencesRepository.createNurtureEmail({
      ...validation.data,
      sequence_id: id
    });

    res.status(201).json({
      success: true,
      data: email
    });
  } catch (error) {
    logger.error({ error }, 'Error creating nurture email');
    res.status(500).json({
      success: false,
      error: 'Failed to create nurture email'
    });
  }
}

/**
 * Update email in sequence
 */
export async function updateEmail(req: Request, res: Response) {
  try {
    const { emailId } = req.params;

    if (!z.string().uuid().safeParse(emailId).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email ID format'
      });
    }

    const validation = updateEmailSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      });
    }

    const email = await nurtureSequencesRepository.updateNurtureEmail(emailId, validation.data);

    if (!email) {
      return res.status(404).json({
        success: false,
        error: 'Nurture email not found'
      });
    }

    res.json({
      success: true,
      data: email
    });
  } catch (error) {
    logger.error({ error }, 'Error updating nurture email');
    res.status(500).json({
      success: false,
      error: 'Failed to update nurture email'
    });
  }
}

/**
 * Delete email from sequence
 */
export async function deleteEmail(req: Request, res: Response) {
  try {
    const { emailId } = req.params;

    if (!z.string().uuid().safeParse(emailId).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email ID format'
      });
    }

    const deleted = await nurtureSequencesRepository.deleteNurtureEmail(emailId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Nurture email not found'
      });
    }

    res.json({
      success: true,
      message: 'Nurture email deleted'
    });
  } catch (error) {
    logger.error({ error }, 'Error deleting nurture email');
    res.status(500).json({
      success: false,
      error: 'Failed to delete nurture email'
    });
  }
}
