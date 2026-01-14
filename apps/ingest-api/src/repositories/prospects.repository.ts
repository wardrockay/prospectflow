/**
 * Prospects Repository - Database access for prospects and related entities
 */
import { createChildLogger, timeOperation } from '../utils/logger.js';
import { getPool } from '../config/database.js';
import { DatabaseError } from '../errors/DatabaseError.js';
import type { ColumnMapping } from '../services/column-validator.service.js';

const logger = createChildLogger('ProspectsRepository');

interface Campaign {
  id: string;
  name: string;
  organisationId: string;
}

interface ImportUpload {
  id: string;
  campaignId: string;
  organisationId: string;
  filename: string;
  fileSize: number;
  fileBuffer: Buffer;
  detectedColumns?: string[];
  columnMappings?: Record<string, string>;
  rowCount?: number;
  uploadedAt: Date;
}

/**
 * Repository for prospect-related database operations
 */
class ProspectsRepository {
  /**
   * Find campaign by ID with multi-tenant isolation
   */
  async findCampaignByIdAndOrg(
    campaignId: string,
    organisationId: string,
  ): Promise<Campaign | null> {
    const pool = getPool();

    try {
      const result = await timeOperation(logger, 'db.prospects.findCampaign', async () => {
        return pool.query<Campaign>(
          `SELECT id, name, organisation_id as "organisationId" 
           FROM crm.campaigns 
           WHERE id = $1 AND organisation_id = $2`,
          [campaignId, organisationId],
        );
      });

      if (result.rows.length === 0) {
        logger.debug({ campaignId, organisationId }, 'Campaign not found');
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, campaignId, organisationId }, 'Failed to fetch campaign');
      throw new DatabaseError('Failed to fetch campaign');
    }
  }

  /**
   * Find import upload by ID with multi-tenant isolation
   */
  async findUploadByIdAndOrg(
    uploadId: string,
    organisationId: string,
  ): Promise<ImportUpload | null> {
    const pool = getPool();

    try {
      const result = await timeOperation(logger, 'db.prospects.findUpload', async () => {
        return pool.query<ImportUpload>(
          `SELECT id, campaign_id as "campaignId", organisation_id as "organisationId",
                  filename, file_size as "fileSize", file_buffer as "fileBuffer",
                  detected_columns as "detectedColumns", column_mappings as "columnMappings",
                  row_count as "rowCount", uploaded_at as "uploadedAt"
           FROM crm.import_uploads 
           WHERE id = $1 AND organisation_id = $2`,
          [uploadId, organisationId],
        );
      });

      if (result.rows.length === 0) {
        logger.debug({ uploadId, organisationId }, 'Upload not found');
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, uploadId, organisationId }, 'Failed to fetch upload');
      throw new DatabaseError('Failed to fetch upload');
    }
  }

  /**
   * Create a new import upload record
   */
  async createUpload(
    uploadId: string,
    campaignId: string,
    organisationId: string,
    filename: string,
    fileSize: number,
    fileBuffer: Buffer,
    rowCount: number,
  ): Promise<ImportUpload> {
    const pool = getPool();

    try {
      const result = await timeOperation(logger, 'db.prospects.createUpload', async () => {
        return pool.query<ImportUpload>(
          `INSERT INTO crm.import_uploads 
             (id, campaign_id, organisation_id, filename, file_size, file_buffer, row_count, uploaded_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           RETURNING id, campaign_id as "campaignId", organisation_id as "organisationId",
                     filename, file_size as "fileSize", file_buffer as "fileBuffer",
                     detected_columns as "detectedColumns", column_mappings as "columnMappings",
                     row_count as "rowCount", uploaded_at as "uploadedAt"`,
          [uploadId, campaignId, organisationId, filename, fileSize, fileBuffer, rowCount],
        );
      });

      logger.info({ uploadId, filename, fileSize, rowCount }, 'Upload record created');
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, uploadId }, 'Failed to create upload record');
      throw new DatabaseError('Failed to create upload record');
    }
  }

  /**
   * Update detected columns and suggested mappings for an upload
   */
  async updateUploadColumns(
    uploadId: string,
    detectedColumns: string[],
    suggestedMappings: ColumnMapping[],
  ): Promise<void> {
    const pool = getPool();

    try {
      await timeOperation(logger, 'db.prospects.updateColumns', async () => {
        return pool.query(
          `UPDATE crm.import_uploads
           SET detected_columns = $1,
               updated_at = NOW()
           WHERE id = $2`,
          [detectedColumns, uploadId],
        );
      });

      logger.debug({ uploadId, columnsCount: detectedColumns.length }, 'Upload columns updated');
    } catch (error) {
      logger.error({ err: error, uploadId }, 'Failed to update upload columns');
      throw new DatabaseError('Failed to update upload columns');
    }
  }

  /**
   * Update column mappings and row count after parsing
   */
  async updateUploadColumnMappings(
    uploadId: string,
    columnMappings: Record<string, string>,
    rowCount: number,
  ): Promise<void> {
    const pool = getPool();

    try {
      await timeOperation(logger, 'db.prospects.updateMappings', async () => {
        return pool.query(
          `UPDATE crm.import_uploads
           SET column_mappings = $1,
               row_count = $2,
               updated_at = NOW()
           WHERE id = $3`,
          [JSON.stringify(columnMappings), rowCount, uploadId],
        );
      });

      logger.debug({ uploadId, rowCount }, 'Upload mappings updated');
    } catch (error) {
      logger.error({ err: error, uploadId }, 'Failed to update upload mappings');
      throw new DatabaseError('Failed to update upload mappings');
    }
  }
}

export const prospectsRepository = new ProspectsRepository();
