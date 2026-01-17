/**
 * Prospects Controller - Handle HTTP requests for prospect imports
 */
import { Request, Response, NextFunction } from 'express';
import { prospectsService } from '../services/prospects.service.js';
import { CsvParserService } from '../services/csv-parser.service.js';
import { ColumnValidatorService } from '../services/column-validator.service.js';
import { createChildLogger } from '../utils/logger.js';
import type { ColumnMappingsInput } from '../types/csv.types.js';

const logger = createChildLogger('ProspectsController');
const csvParser = new CsvParserService();
const columnValidator = new ColumnValidatorService();

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

  /**
   * GET /api/v1/imports/:uploadId/columns
   * Get detected columns and suggested mappings for uploaded CSV
   */
  async getColumns(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { uploadId } = req.params;
    const organisationId = req.organisationId;

    try {
      if (!organisationId) {
        logger.error({ uploadId }, 'Organisation ID missing from request');
        res.status(401).json({
          success: false,
          error: 'Unauthorized - Organisation ID missing',
        });
        return;
      }

      logger.info({ uploadId, organisationId }, 'Fetching column mappings');

      const result = await prospectsService.getColumnMappings(uploadId, organisationId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error({ err: error, uploadId, organisationId }, 'Failed to get column mappings');
      next(error);
    }
  }

  /**
   * POST /api/v1/imports/:uploadId/parse
   * Parse CSV with user-confirmed column mappings
   */
  async parseCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { uploadId } = req.params;
    const organisationId = req.organisationId;

    try {
      const { columnMappings } = req.body as ColumnMappingsInput;

      if (!organisationId) {
        logger.error({ uploadId }, 'Organisation ID missing from request');
        res.status(401).json({
          success: false,
          error: 'Unauthorized - Organisation ID missing',
        });
        return;
      }

      if (!columnMappings) {
        logger.warn({ uploadId }, 'Column mappings missing from request');
        res.status(400).json({
          success: false,
          error: 'Column mappings required',
        });
        return;
      }

      logger.info(
        { uploadId, organisationId, mappingsCount: Object.keys(columnMappings).length },
        'Parsing CSV with mappings',
      );

      const result = await prospectsService.parseWithMappings(
        uploadId,
        organisationId,
        columnMappings,
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error({ err: error, uploadId, organisationId }, 'Failed to parse CSV with mappings');
      next(error);
    }
  }

  /**
   * POST /api/v1/imports/:uploadId/validate-data
   * Validate prospect data fields (email, company, URL, etc.)
   */
  async validateData(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { uploadId } = req.params;
    const organisationId = req.organisationId;

    try {
      if (!organisationId) {
        logger.error({ uploadId }, 'Organisation ID missing from request');
        res.status(401).json({
          success: false,
          error: 'Unauthorized - Organisation ID missing',
        });
        return;
      }

      // Extract override duplicates flag from request body
      const { overrideDuplicates } = req.body as { overrideDuplicates?: boolean };

      logger.info(
        { uploadId, organisationId, overrideDuplicates },
        'Validating prospect data',
      );

      const result = await prospectsService.validateData(uploadId, organisationId, {
        overrideDuplicates,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error({ err: error, uploadId, organisationId }, 'Failed to validate prospect data');
      next(error);
    }
  }
}

export const prospectsController = new ProspectsController();
