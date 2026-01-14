/**
 * Prospects Controller - Handle HTTP requests for prospect imports
 */
import { Request, Response, NextFunction } from 'express';
import { prospectsService } from '../services/prospects.service.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('ProspectsController');

/**
 * Controller for prospect CSV upload endpoints
 */
export class ProspectsController {
  /**
   * POST /api/v1/campaigns/:campaignId/prospects/upload
   * Upload a CSV file of prospects to a campaign
   */
  async uploadCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { campaignId } = req.params;
      const organisationId = req.organisationId;

      if (!organisationId) {
        logger.error({ campaignId }, 'Organisation ID missing from request');
        res.status(401).json({
          success: false,
          error: 'Unauthorized - Organisation ID missing',
        });
        return;
      }

      if (!req.file) {
        logger.warn({ campaignId, organisationId }, 'No file provided in upload request');
        res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
        return;
      }

      logger.info(
        { campaignId, organisationId, filename: req.file.originalname },
        'Processing CSV upload',
      );

      const result = await prospectsService.handleUpload(campaignId, organisationId, req.file);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/campaigns/prospects/template
   * Download CSV template with example data
   */
  async downloadTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.debug('Generating CSV template');

      const template = await prospectsService.generateTemplate();

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="prospect_import_template.csv"');
      res.send(template);
    } catch (error) {
      next(error);
    }
  }
}

export const prospectsController = new ProspectsController();
