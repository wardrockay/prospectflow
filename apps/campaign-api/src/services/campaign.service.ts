import { createChildLogger } from '../utils/logger.js';
import { CampaignRepository } from '../repositories/campaign.repository.js';
import type { Campaign, CreateCampaignInput } from '../types/campaign.js';
import type { CampaignListQueryParams, CampaignListResult } from '../types/campaign.js';

const logger = createChildLogger('CampaignService');

export class CampaignService {
  constructor(private readonly campaignRepository: CampaignRepository) {}

  async createCampaign(organisationId: string, input: CreateCampaignInput): Promise<Campaign> {
    logger.info({ organisationId, campaignName: input.name }, 'Creating new campaign');

    const campaign = await this.campaignRepository.create(organisationId, input);

    logger.info({ organisationId, campaignId: campaign.id }, 'Campaign created successfully');

    return campaign;
  }

  async listCampaigns(
    organisationId: string,
    params: CampaignListQueryParams,
  ): Promise<CampaignListResult> {
    logger.info({ organisationId, ...params }, 'Listing campaigns');

    const result = await this.campaignRepository.findAll(organisationId, params);

    logger.info(
      { organisationId, totalCampaigns: result.campaigns.length },
      'Campaigns listed successfully',
    );

    return result;
  }
}
