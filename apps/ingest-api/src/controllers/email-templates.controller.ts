import { Request, Response } from 'express';
import { z } from 'zod';
import * as emailTemplatesRepository from '../repositories/email-templates.repository.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('EmailTemplatesController');

// Validation schemas
const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  subject: z.string().min(1).max(500),
  html_body: z.string().min(1),
  description: z.string().optional()
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  subject: z.string().min(1).max(500).optional(),
  html_body: z.string().min(1).optional(),
  description: z.string().optional()
});

const previewTemplateSchema = z.object({
  html_body: z.string().min(1),
  sample_data: z.object({
    email: z.string().email().optional(),
    download_url: z.string().url().optional(),
    subscriber_name: z.string().optional()
  }).optional()
});

/**
 * List all email templates
 */
export async function listTemplates(req: Request, res: Response) {
  try {
    const templates = await emailTemplatesRepository.listEmailTemplates();
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    logger.error({ error }, 'Error listing email templates');
    res.status(500).json({
      success: false,
      error: 'Failed to list email templates'
    });
  }
}

/**
 * Get email template by ID
 */
export async function getTemplateById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID format'
      });
    }

    const template = await emailTemplatesRepository.getEmailTemplateById(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Email template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error({ error }, 'Error getting email template');
    res.status(500).json({
      success: false,
      error: 'Failed to get email template'
    });
  }
}

/**
 * Create new email template
 */
export async function createTemplate(req: Request, res: Response) {
  try {
    const validation = createTemplateSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      });
    }

    const template = await emailTemplatesRepository.createEmailTemplate(validation.data);

    res.status(201).json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error({ error }, 'Error creating email template');
    res.status(500).json({
      success: false,
      error: 'Failed to create email template'
    });
  }
}

/**
 * Update email template
 */
export async function updateTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID format'
      });
    }

    const validation = updateTemplateSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      });
    }

    const template = await emailTemplatesRepository.updateEmailTemplate(id, validation.data);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Email template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error({ error }, 'Error updating email template');
    res.status(500).json({
      success: false,
      error: 'Failed to update email template'
    });
  }
}

/**
 * Delete email template
 */
export async function deleteTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID format'
      });
    }

    const deleted = await emailTemplatesRepository.deleteEmailTemplate(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Email template not found'
      });
    }

    res.json({
      success: true,
      message: 'Email template deleted'
    });
  } catch (error) {
    logger.error({ error }, 'Error deleting email template');
    res.status(500).json({
      success: false,
      error: 'Failed to delete email template'
    });
  }
}

/**
 * Preview email template with sample data
 */
export async function previewTemplate(req: Request, res: Response) {
  try {
    const validation = previewTemplateSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      });
    }

    const { html_body, sample_data } = validation.data;
    const preview = emailTemplatesRepository.previewEmailTemplate(html_body, sample_data);

    res.json({
      success: true,
      data: {
        preview_html: preview
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error previewing email template');
    res.status(500).json({
      success: false,
      error: 'Failed to preview email template'
    });
  }
}
