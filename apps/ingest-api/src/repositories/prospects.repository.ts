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

export interface ExistingProspect {
  id: string;
  contactEmail: string;
  campaignId: string;
  campaignName: string;
  status: string;
  createdAt: Date;
  daysSinceCreated: number;
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
           FROM outreach.campaigns 
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
           FROM outreach.import_uploads 
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
          `INSERT INTO outreach.import_uploads 
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
          `UPDATE outreach.import_uploads
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
          `UPDATE outreach.import_uploads
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

  /**
   * Find existing prospects by email addresses for duplicate detection
   * @param organisationId - Organisation ID for multi-tenant isolation
   * @param emails - Array of normalized (lowercase) email addresses
   * @returns Array of existing prospects with campaign info
   */
  async findExistingProspectsByEmails(
    organisationId: string,
    emails: string[],
  ): Promise<ExistingProspect[]> {
    const pool = getPool();

    logger.debug({ organisationId, emailCount: emails.length }, 'Finding existing prospects by emails');

    if (emails.length === 0) {
      return [];
    }

    // Batch lookup query with IN clause
    const query = `
      SELECT 
        p.id,
        p.contact_email as "contactEmail",
        p.campaign_id as "campaignId",
        c.name as "campaignName",
        p.status,
        p.created_at as "createdAt",
        EXTRACT(DAY FROM (NOW() - p.created_at))::INTEGER as "daysSinceCreated"
      FROM crm.people p
      INNER JOIN outreach.campaigns c 
        ON p.organisation_id = c.organisation_id 
        AND p.campaign_id = c.id
      WHERE p.organisation_id = $1
        AND LOWER(p.contact_email) = ANY($2)
      ORDER BY p.created_at DESC
    `;

    try {
      const result = await timeOperation(logger, 'db.prospects.findExistingByEmails', async () => {
        return pool.query<ExistingProspect>(query, [organisationId, emails]);
      });

      logger.info(
        {
          organisationId,
          emailCount: emails.length,
          foundCount: result.rows.length,
        },
        'Found existing prospects',
      );

      return result.rows;
    } catch (error) {
      logger.error({ err: error, organisationId, emailCount: emails.length }, 'Error finding existing prospects');
      throw new DatabaseError('Failed to check for duplicate prospects');
    }
  }

  /**
   * Batch insert prospects into crm.people table
   * @param prospects - Array of prospect data to insert
   * @param campaignId - Campaign ID to associate prospects with
   * @param organisationId - Organisation ID for multi-tenant isolation
   * @returns Array of inserted prospect IDs
   */
  async batchInsertProspects(
    prospects: Array<{
      company_name: string;
      contact_email: string;
      contact_name?: string;
      website_url?: string;
    }>,
    campaignId: string,
    organisationId: string,
  ): Promise<Array<{ id: string; contactEmail: string }>> {
    const pool = getPool();

    if (prospects.length === 0) {
      logger.warn({ campaignId, organisationId }, 'No prospects to insert');
      return [];
    }

    logger.info(
      { campaignId, organisationId, count: prospects.length },
      'Batch inserting prospects',
    );

    // Build VALUES clause for batch insert
    const values: (string | null)[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    prospects.forEach((prospect) => {
      placeholders.push(
        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, 'New', NOW(), NOW())`,
      );
      values.push(
        organisationId,
        campaignId,
        prospect.company_name,
        prospect.contact_email,
        prospect.contact_name || null,
        prospect.website_url || null,
      );
    });

    const query = `
      INSERT INTO crm.people (
        organisation_id,
        campaign_id,
        company_name,
        contact_email,
        contact_name,
        website_url,
        status,
        created_at,
        updated_at
      )
      VALUES ${placeholders.join(', ')}
      RETURNING id, contact_email as "contactEmail"
    `;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const startTime = Date.now();
      const result = await client.query(query, values);
      const duration = Date.now() - startTime;

      await client.query('COMMIT');

      logger.info(
        {
          campaignId,
          organisationId,
          inserted: result.rows.length,
          duration,
        },
        'Prospects inserted successfully',
      );

      return result.rows;
    } catch (error) {
      await client.query('ROLLBACK');

      logger.error(
        { err: error, campaignId, organisationId, count: prospects.length },
        'Error inserting prospects - transaction rolled back',
      );

      throw new DatabaseError('Failed to insert prospects');
    } finally {
      client.release();
    }
  }
}

export const prospectsRepository = new ProspectsRepository();
