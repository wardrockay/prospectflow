import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { createChildLogger } from '../utils/logger.js';
import { trackDatabaseQuery } from '../utils/metrics.utils.js';
import type { Campaign, CreateCampaignInput } from '../types/campaign.js';
import type {
  CampaignListItem,
  CampaignListQueryParams,
  CampaignListResult,
} from '../types/campaign.js';
import type { UpdateCampaignDto } from '../schemas/campaign.schema.js';

const logger = createChildLogger('CampaignRepository');

export class CampaignRepository {
  constructor(private readonly pool: Pool) {}

  async create(organisationId: string, input: CreateCampaignInput): Promise<Campaign> {
    const id = uuidv4();
    const now = new Date();

    logger.debug({ organisationId, campaignName: input.name }, 'Creating campaign');

    const result = await trackDatabaseQuery('INSERT', 'outreach', async () => {
      return this.pool.query<Campaign>(
        `INSERT INTO outreach.campaigns 
         (id, organisation_id, name, value_prop, template_id, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'draft', $6, $6)
         RETURNING 
           id,
           organisation_id AS "organisationId",
           name,
           value_prop AS "valueProp",
           template_id AS "templateId",
           status,
           created_at AS "createdAt",
           updated_at AS "updatedAt"`,
        [id, organisationId, input.name, input.valueProp || null, input.templateId || null, now],
      );
    });

    logger.info({ organisationId, campaignId: id }, 'Campaign created successfully');

    return result.rows[0];
  }

  async findAll(
    organisationId: string,
    params: CampaignListQueryParams,
  ): Promise<CampaignListResult> {
    const {
      page = 1,
      limit = 25,
      sortBy = 'updatedAt',
      order = 'desc',
      includeArchived = false,
    } = params;
    const offset = (page - 1) * limit;

    // Security: Whitelist mapping to prevent SQL injection
    const sortColumns: Record<string, string> = {
      updatedAt: 'c.updated_at',
      createdAt: 'c.created_at',
      name: 'c.name',
    };
    const sortOrders: Record<string, string> = { asc: 'ASC', desc: 'DESC' };

    const sortColumn = sortColumns[sortBy] || sortColumns.updatedAt;
    const sortOrder = sortOrders[order] || sortOrders.desc;

    // Build status filter: exclude archived by default
    const statusFilter = includeArchived ? '' : "AND c.status != 'archived'";

    logger.debug(
      { organisationId, page, limit, sortBy, order, includeArchived },
      'Fetching campaign list',
    );

    // Count total campaigns for pagination
    const countResult = await trackDatabaseQuery('SELECT', 'outreach', async () => {
      return this.pool.query<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM outreach.campaigns c
         WHERE c.organisation_id = $1 ${statusFilter}`,
        [organisationId],
      );
    });

    const totalItems = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalItems / limit);

    // Fetch campaigns with aggregated metrics via LEFT JOINs
    // LEFT JOIN used (not INNER) to include campaigns with 0 prospects/messages
    // Prospects counted via campaign_enrollments
    // Messages linked via enrollment_id (not campaign_id directly)
    const result = await trackDatabaseQuery('SELECT', 'outreach', async () => {
      return this.pool.query<CampaignListItem>(
        `SELECT
           c.id,
           c.organisation_id AS "organisationId",
           c.name,
           c.value_prop AS "valueProp",
           c.template_id AS "templateId",
           c.status,
           c.created_at AS "createdAt",
           c.updated_at AS "updatedAt",
           COALESCE(COUNT(DISTINCT e.id), 0)::int AS "totalProspects",
           COALESCE(COUNT(DISTINCT CASE WHEN m.sent_at IS NOT NULL THEN m.id END), 0)::int AS "emailsSent",
           COALESCE(COUNT(DISTINCT CASE WHEN m.direction = 'inbound' THEN m.id END), 0)::int AS "responseCount",
           -- Calculate response rate as percentage: (inbound_messages / sent_emails) * 100
           -- Returns 0 if no emails sent to avoid division by zero
           CASE
             WHEN COUNT(DISTINCT CASE WHEN m.sent_at IS NOT NULL THEN m.id END) > 0
             THEN ROUND(
               COUNT(DISTINCT CASE WHEN m.direction = 'inbound' THEN m.id END)::numeric /
               COUNT(DISTINCT CASE WHEN m.sent_at IS NOT NULL THEN m.id END)::numeric * 100,
               2
             )
             ELSE 0
           END AS "responseRate"
         FROM outreach.campaigns c
         LEFT JOIN outreach.campaign_enrollments e ON e.organisation_id = c.organisation_id AND e.campaign_id = c.id
         LEFT JOIN outreach.messages m ON m.organisation_id = c.organisation_id AND m.enrollment_id = e.id
         WHERE c.organisation_id = $1 ${statusFilter}
         GROUP BY c.id, c.organisation_id, c.name, c.value_prop, c.template_id, c.status, c.created_at, c.updated_at
         ORDER BY ${sortColumn} ${sortOrder}
         LIMIT $2 OFFSET $3`,
        [organisationId, limit, offset],
      );
    });

    logger.info({ organisationId, totalItems, page, totalPages }, 'Campaign list fetched');

    return {
      campaigns: result.rows,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }

  /**
   * Find campaign by ID with aggregated metrics
   * Uses same JOIN pattern as findAll for consistency
   */
  async findById(organisationId: string, campaignId: string): Promise<CampaignListItem | null> {
    logger.debug({ organisationId, campaignId }, 'Fetching campaign by ID');

    const result = await trackDatabaseQuery('SELECT', 'outreach', async () => {
      return this.pool.query<CampaignListItem>(
        `SELECT
           c.id,
           c.organisation_id AS "organisationId",
           c.name,
           c.value_prop AS "valueProp",
           c.template_id AS "templateId",
           c.status,
           c.created_at AS "createdAt",
           c.updated_at AS "updatedAt",

           -- Aggregated metrics (same as list query for consistency)
           COALESCE(COUNT(DISTINCT e.id), 0)::int AS "totalProspects",
           COALESCE(COUNT(DISTINCT CASE WHEN m.sent_at IS NOT NULL THEN m.id END), 0)::int AS "emailsSent",
           COALESCE(COUNT(DISTINCT CASE WHEN m.direction = 'inbound' THEN m.id END), 0)::int AS "responseCount",
           CASE
             WHEN COUNT(DISTINCT CASE WHEN m.sent_at IS NOT NULL THEN m.id END) > 0
             THEN ROUND(
               COUNT(DISTINCT CASE WHEN m.direction = 'inbound' THEN m.id END)::numeric /
               COUNT(DISTINCT CASE WHEN m.sent_at IS NOT NULL THEN m.id END)::numeric * 100,
               2
             )
             ELSE 0
           END AS "responseRate"

         FROM outreach.campaigns c
         -- LEFT JOINs to include campaigns with 0 prospects/messages
         LEFT JOIN outreach.campaign_enrollments e
           ON e.organisation_id = c.organisation_id
           AND e.campaign_id = c.id
         LEFT JOIN outreach.messages m
           ON m.organisation_id = c.organisation_id
           AND m.enrollment_id = e.id
         WHERE c.organisation_id = $1
           AND c.id = $2
         GROUP BY c.id, c.organisation_id, c.name, c.value_prop, c.template_id, c.status, c.created_at, c.updated_at`,
        [organisationId, campaignId],
      );
    });

    if (result.rows.length === 0) {
      logger.warn({ organisationId, campaignId }, 'Campaign not found');
      return null;
    }

    logger.info({ organisationId, campaignId }, 'Campaign fetched successfully');
    return result.rows[0];
  }

  /**
   * Update campaign fields
   * Dynamically builds SET clause based on provided fields
   * @returns Updated campaign (basic fields only, no metrics)
   */
  async update(
    organisationId: string,
    campaignId: string,
    updates: UpdateCampaignDto,
  ): Promise<Campaign | null> {
    const fields = Object.keys(updates);
    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    // Build SET clause dynamically: "name = $3, value_prop = $4"
    // Map camelCase to snake_case for DB columns
    const columnMapping: Record<string, string> = {
      name: 'name',
      valueProp: 'value_prop',
      status: 'status',
    };

    const setClauses = fields.map((field, index) => {
      const column = columnMapping[field];
      return `${column} = $${index + 3}`; // $1, $2 are organisationId, campaignId
    });

    const values = fields.map((field) => updates[field as keyof UpdateCampaignDto]);

    logger.debug({ organisationId, campaignId, updates }, 'Updating campaign');

    const result = await trackDatabaseQuery('UPDATE', 'outreach', async () => {
      return this.pool.query<Campaign>(
        `UPDATE outreach.campaigns
         SET ${setClauses.join(', ')},
             updated_at = now()
         WHERE organisation_id = $1
           AND id = $2
         RETURNING
           id,
           organisation_id AS "organisationId",
           name,
           value_prop AS "valueProp",
           template_id AS "templateId",
           status,
           created_at AS "createdAt",
           updated_at AS "updatedAt"`,
        [organisationId, campaignId, ...values],
      );
    });

    if (result.rows.length === 0) {
      logger.warn({ organisationId, campaignId }, 'Campaign not found for update');
      return null;
    }

    logger.info({ organisationId, campaignId, updates }, 'Campaign updated successfully');
    return result.rows[0];
  }
}
