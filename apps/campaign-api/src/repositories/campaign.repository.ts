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
        [id, organisationId, input.name, input.valueProp, input.templateId || null, now],
      );
    });

    logger.info({ organisationId, campaignId: id }, 'Campaign created successfully');

    return result.rows[0];
  }

  async findAll(
    organisationId: string,
    params: CampaignListQueryParams,
  ): Promise<CampaignListResult> {
    const { page = 1, limit = 25, sortBy = 'updatedAt', order = 'desc' } = params;
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

    logger.debug({ organisationId, page, limit, sortBy, order }, 'Fetching campaign list');

    // Count total campaigns for pagination
    const countResult = await trackDatabaseQuery('SELECT', 'outreach', async () => {
      return this.pool.query<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM outreach.campaigns
         WHERE organisation_id = $1`,
        [organisationId],
      );
    });

    const totalItems = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalItems / limit);

    // Fetch campaigns with aggregated metrics via LEFT JOINs
    // LEFT JOIN used (not INNER) to include campaigns with 0 prospects/messages
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
           COALESCE(COUNT(DISTINCT p.id), 0)::int AS "totalProspects",
           COALESCE(COUNT(DISTINCT CASE WHEN m.sent_at IS NOT NULL THEN m.id END), 0)::int AS "emailsSent",
           COALESCE(COUNT(DISTINCT CASE WHEN m.replied_at IS NOT NULL THEN m.id END), 0)::int AS "responseCount",
           -- Calculate response rate as percentage: (replies / sent_emails) * 100
           -- Returns 0 if no emails sent to avoid division by zero
           CASE
             WHEN COUNT(DISTINCT CASE WHEN m.sent_at IS NOT NULL THEN m.id END) > 0
             THEN ROUND(
               COUNT(DISTINCT CASE WHEN m.replied_at IS NOT NULL THEN m.id END)::numeric /
               COUNT(DISTINCT CASE WHEN m.sent_at IS NOT NULL THEN m.id END)::numeric * 100,
               2
             )
             ELSE 0
           END AS "responseRate"
         FROM outreach.campaigns c
         LEFT JOIN outreach.tasks t ON t.organisation_id = c.organisation_id AND t.campaign_id = c.id
         LEFT JOIN crm.people p ON p.organisation_id = t.organisation_id AND p.id = t.person_id
         LEFT JOIN outreach.messages m ON m.organisation_id = c.organisation_id AND m.campaign_id = c.id
         WHERE c.organisation_id = $1
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
}
