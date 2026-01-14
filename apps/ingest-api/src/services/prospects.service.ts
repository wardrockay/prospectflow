/**
 * Prospects Service - Business logic for prospect CSV uploads
 */
import { createChildLogger } from '../utils/logger.js';
import { prospectsRepository } from '../repositories/prospects.repository.js';
import { CsvParserService } from './csv-parser.service.js';
import { ColumnValidatorService } from './column-validator.service.js';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../errors/AppError.js';
import { ValidationError } from '../errors/ValidationError.js';
import type { ColumnDetectionResponse, ParsedCsvData } from '../types/csv.types.js';

const logger = createChildLogger('ProspectsService');
const csvParser = new CsvParserService();
const columnValidator = new ColumnValidatorService();

interface UploadResult {
  uploadId: string;
  filename: string;
  fileSize: number;
  rowCount: number;
  uploadedAt: string;
}

/**
 * Service for handling prospect CSV uploads and template generation
 */
export class ProspectsService {
  /**
   * Handle CSV file upload
   * - Validates campaign exists and belongs to organization
   * - Counts rows in CSV
   * - Returns upload metadata
   */
  async handleUpload(
    campaignId: string,
    organisationId: string,
    file: Express.Multer.File,
  ): Promise<UploadResult> {
    logger.info({ campaignId, organisationId, filename: file.originalname }, 'Handling CSV upload');

    // Verify campaign exists and belongs to org (multi-tenant isolation)
    const campaign = await prospectsRepository.findCampaignByIdAndOrg(campaignId, organisationId);

    if (!campaign) {
      logger.warn({ campaignId, organisationId }, 'Campaign not found or access denied');
      throw new AppError('Campaign not found', 404);
    }

    // Count rows in CSV (excluding header)
    const csvContent = file.buffer.toString('utf-8');
    const lines = csvContent.split('\n').filter((line) => line.trim() !== '');
    const rowCount = Math.max(0, lines.length - 1); // Exclude header

    logger.debug({ rowCount, fileSize: file.size }, 'CSV parsed');

    const uploadId = uuidv4();
    const uploadedAt = new Date().toISOString();

    // TODO: Store file temporarily for next step (parsing/validation)
    // For now, we just return metadata

    logger.info({ uploadId, campaignId, rowCount }, 'CSV upload processed successfully');

    return {
      uploadId,
      filename: file.originalname,
      fileSize: file.size,
      rowCount,
      uploadedAt,
    };
  }

  /**
   * Generate CSV template with headers and example row
   */
  async generateTemplate(): Promise<string> {
    logger.debug('Generating CSV template');

    const template = [
      'company_name,contact_email,contact_name,website_url',
      'Acme Corp,sarah@acmecorp.com,Sarah Johnson,https://acmecorp.com',
    ].join('\n');

    return template;
  }

  /**
   * Get detected columns and suggested mappings for an uploaded CSV
   */
  async getColumnMappings(
    uploadId: string,
    organisationId: string,
  ): Promise<ColumnDetectionResponse> {
    logger.info({ uploadId, organisationId }, 'Fetching column mappings');

    // Get upload record (multi-tenant check)
    const upload = await prospectsRepository.findUploadByIdAndOrg(uploadId, organisationId);

    if (!upload) {
      logger.warn({ uploadId, organisationId }, 'Upload not found or access denied');
      throw new AppError('Upload not found', 404);
    }

    // If mappings already computed, return cached result
    if (upload.detectedColumns && upload.columnMappings) {
      const suggestedMappings = columnValidator.suggestMappings(upload.detectedColumns);
      const validation = columnValidator.validateRequiredColumns(suggestedMappings);

      logger.debug({ uploadId, cached: true }, 'Returning cached column mappings');

      return {
        uploadId,
        detectedColumns: upload.detectedColumns,
        suggestedMappings,
        validation,
      };
    }

    // Parse CSV to detect columns
    const parseResult = await csvParser.parse(upload.fileBuffer);

    if (parseResult.errors.length > 0) {
      logger.warn(
        { uploadId, errorCount: parseResult.errors.length },
        'CSV parsing errors detected',
      );
      throw new ValidationError(
        'CSV file format is invalid. Please check for unclosed quotes or inconsistent column counts.',
      );
    }

    if (parseResult.rowCount === 0) {
      logger.warn({ uploadId }, 'CSV file is empty');
      throw new ValidationError('CSV file contains no data rows');
    }

    // Suggest column mappings
    const suggestedMappings = columnValidator.suggestMappings(parseResult.headers);
    const validation = columnValidator.validateRequiredColumns(suggestedMappings);

    // Cache results in database
    await prospectsRepository.updateUploadColumns(uploadId, parseResult.headers, suggestedMappings);

    logger.info(
      { uploadId, columnsDetected: parseResult.headers.length },
      'Column mappings generated',
    );

    return {
      uploadId,
      detectedColumns: parseResult.headers,
      suggestedMappings,
      validation,
    };
  }

  /**
   * Parse CSV with user-confirmed column mappings
   */
  async parseWithMappings(
    uploadId: string,
    organisationId: string,
    columnMappings: Record<string, string>,
  ): Promise<ParsedCsvData> {
    logger.info(
      { uploadId, organisationId, mappingsCount: Object.keys(columnMappings).length },
      'Parsing CSV with mappings',
    );

    // Get upload record (multi-tenant check)
    const upload = await prospectsRepository.findUploadByIdAndOrg(uploadId, organisationId);

    if (!upload) {
      logger.warn({ uploadId, organisationId }, 'Upload not found or access denied');
      throw new AppError('Upload not found', 404);
    }

    // Validate that required columns are mapped
    const mappedColumns = Object.values(columnMappings);
    const requiredColumns = columnValidator.getRequiredColumns();
    const missingColumns = requiredColumns.filter((col) => !mappedColumns.includes(col));

    if (missingColumns.length > 0) {
      logger.warn({ uploadId, missingColumns }, 'Required columns not mapped');
      throw new ValidationError(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    // Parse CSV
    const parseResult = await csvParser.parse(upload.fileBuffer);

    if (parseResult.errors.length > 0) {
      logger.warn({ uploadId, errorCount: parseResult.errors.length }, 'CSV parsing errors');

      const parseErrors = parseResult.errors.map((err) => ({
        row: err.row,
        message: err.message,
      }));

      return {
        uploadId,
        rowCount: 0,
        columnsMapped: mappedColumns,
        preview: [],
        parseErrors,
      };
    }

    // Remap data using user mappings
    const remappedData = parseResult.data.map((row) => {
      const newRow: Record<string, string> = {};
      for (const [detectedCol, targetCol] of Object.entries(columnMappings)) {
        newRow[targetCol] = row[detectedCol.toLowerCase()] || '';
      }
      return newRow;
    });

    // Store column mappings in database
    await prospectsRepository.updateUploadColumnMappings(
      uploadId,
      columnMappings,
      parseResult.rowCount,
    );

    logger.info(
      { uploadId, rowCount: parseResult.rowCount },
      'CSV parsed successfully with mappings',
    );

    return {
      uploadId,
      rowCount: parseResult.rowCount,
      columnsMapped: mappedColumns,
      preview: remappedData.slice(0, 3), // Return first 3 rows as preview
      parseErrors: [],
    };
  }
}

export const prospectsService = new ProspectsService();
