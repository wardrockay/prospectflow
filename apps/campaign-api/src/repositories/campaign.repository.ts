import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { createChildLogger } from '../utils/logger.js';
import { trackDatabaseQuery } from '../utils/metrics.utils.js';
import type { Campaign, CreateCampaignInput } from '../types/campaign.js';

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
}
