import { Pool, PoolClient } from 'pg';
import { createChildLogger } from '../utils/logger.js';
import { DatabaseError } from '../errors/DatabaseError.js';
import type { ProspectData, InsertedProspect } from '../types/validation.types.js';

export class ProspectRepository {
  private readonly logger = createChildLogger('ProspectRepository');

  constructor(private pool: Pool) {}

  /**
   * Batch insert prospects into crm.people table
   * @param prospects - Array of prospect data to insert
   * @param campaignId - Campaign ID to associate prospects with
   * @param organisationId - Organisation ID for multi-tenant isolation
   * @returns Array of inserted prospect IDs
   */
  async batchInsertProspects(
    prospects: ProspectData[],
    campaignId: string,
    organisationId: string,
  ): Promise<InsertedProspect[]> {
    const logger = createChildLogger('ProspectRepository.batchInsertProspects');

    if (prospects.length === 0) {
      logger.warn({ campaignId, organisationId }, 'No prospects to insert');
      return [];
    }

    logger.info(
      { campaignId, organisationId, count: prospects.length },
      'Batch inserting prospects',
    );

    // Build VALUES clause for batch insert
    const values: any[] = [];
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
      RETURNING id, contact_email
    `;

    const client = await this.pool.connect();

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

      return result.rows.map((row) => ({
        id: row.id,
        contactEmail: row.contact_email,
      }));
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

  /**
   * Find existing prospects by emails for duplicate detection
   * @param emails - Array of emails to search for
   * @param organisationId - Organisation ID for multi-tenant isolation
   * @param campaignId - Optional campaign ID to filter by
   * @returns Array of existing prospects with email, campaign info, status
   */
  async findExistingProspectsByEmails(
    emails: string[],
    organisationId: string,
    campaignId?: string,
  ): Promise<
    Array<{
      email: string;
      id: string;
      campaignId: string;
      campaignName: string;
      status: string;
      createdAt: Date;
    }>
  > {
    const logger = createChildLogger('ProspectRepository.findExistingProspectsByEmails');

    if (emails.length === 0) {
      return [];
    }

    logger.debug(
      { organisationId, campaignId, emailCount: emails.length },
      'Searching for existing prospects',
    );

    // Normalize emails to lowercase for comparison
    const normalizedEmails = emails.map((email) => email.toLowerCase().trim());

    let query = `
      SELECT 
        p.id,
        LOWER(TRIM(p.contact_email)) as email,
        p.campaign_id as "campaignId",
        c.name as "campaignName",
        p.status,
        p.created_at as "createdAt"
      FROM crm.people p
      JOIN outreach.campaigns c ON (p.organisation_id = c.organisation_id AND p.campaign_id = c.id)
      WHERE p.organisation_id = $1
        AND LOWER(TRIM(p.contact_email)) = ANY($2::text[])
    `;

    const params: any[] = [organisationId, normalizedEmails];

    if (campaignId) {
      query += ' AND p.campaign_id = $3';
      params.push(campaignId);
    }

    try {
      const result = await this.pool.query(query, params);

      logger.debug(
        { organisationId, campaignId, found: result.rows.length },
        'Found existing prospects',
      );

      return result.rows;
    } catch (error) {
      logger.error(
        { err: error, organisationId, campaignId },
        'Error finding existing prospects',
      );
      throw new DatabaseError('Failed to find existing prospects');
    }
  }
}
