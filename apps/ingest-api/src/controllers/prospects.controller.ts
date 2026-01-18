/**
 * Prospects Controller - Handle HTTP requests for prospect imports
 */
import { Request, Response, NextFunction } from 'express';
import { prospectsService } from '../services/prospects.service.js';
import { ImportProspectsService } from '../services/import-prospects.service.js';
import { ExportErrorsService } from '../services/export-errors.service.js';
import { ProspectRepository } from '../repositories/prospect.repository.js';
import { getPool } from '../config/database.js';
import { createChildLogger } from '../utils/logger.js';
import type { ColumnMappingsInput } from '../types/csv.types.js';
import type { ValidationResult } from '../types/index.js';

const logger = createChildLogger('ProspectsController');
const prospectRepository = new ProspectRepository(getPool());
const importProspectsService = new ImportProspectsService(prospectRepository);
const exportErrorsService = new ExportErrorsService();

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
   * POST /api/v1/imports/:uploadId/map
   * Save user-confirmed column mappings for later processing
   */
  async saveColumnMappings(req: Request, res: Response, next: NextFunction): Promise<void> {
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
        'Saving column mappings',
      );

      const result = await prospectsService.saveColumnMappings(
        uploadId,
        organisationId,
        columnMappings,
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error({ err: error, uploadId, organisationId }, 'Failed to save column mappings');
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

  /**
   * POST /api/v1/prospects/import
   * Import valid prospects from validation result
   */
  async importProspects(req: Request, res: Response, next: NextFunction): Promise<void> {
    const organisationId = req.organisationId;

    try {
      const { validationResult, campaignId } = req.body as {
        validationResult: ValidationResult;
        campaignId: string;
      };

      if (!organisationId) {
        logger.error('Organisation ID missing from request');
        res.status(401).json({
          success: false,
          error: 'Unauthorized - Organisation ID missing',
        });
        return;
      }

      if (!validationResult || !campaignId) {
        logger.warn({ organisationId }, 'Missing validation result or campaign ID');
        res.status(400).json({
          success: false,
          error: 'Validation result and campaign ID required',
        });
        return;
      }

      logger.info({ campaignId, organisationId }, 'Importing valid prospects');

      const summary = await importProspectsService.importValidProspects(
        validationResult,
        campaignId,
        organisationId,
      );

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      logger.error({ err: error, organisationId }, 'Failed to import prospects');
      next(error);
    }
  }

  /**
   * POST /api/v1/prospects/export-errors
   * Export validation errors as CSV file
   */
  async exportErrors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { validationResult } = req.body as { validationResult: ValidationResult };

      if (!validationResult) {
        logger.warn('Missing validation result');
        res.status(400).json({
          success: false,
          error: 'Validation result required',
        });
        return;
      }

      logger.info('Generating error CSV');

      const csv = await exportErrorsService.generateErrorCSV(validationResult);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `validation-errors-${timestamp}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (error) {
      logger.error({ err: error }, 'Failed to export errors');
      next(error);
    }
  }
}

export const prospectsController = new ProspectsController();
