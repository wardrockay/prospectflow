/**
 * Prospects Service - Business logic for prospect CSV uploads
 */
import { createChildLogger } from '../utils/logger.js';
import { prospectsRepository } from '../repositories/prospects.repository.js';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../errors/AppError.js';

const logger = createChildLogger('ProspectsService');

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
}

export const prospectsService = new ProspectsService();
