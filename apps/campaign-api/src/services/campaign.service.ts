import { createChildLogger } from '../utils/logger.js';
import { CampaignRepository } from '../repositories/campaign.repository.js';
import type { Campaign, CreateCampaignInput, CampaignListItem } from '../types/campaign.js';
import type { CampaignListQueryParams, CampaignListResult } from '../types/campaign.js';
import { NotFoundError } from '../errors/http-errors.js';
import { ValidationError } from '../errors/ValidationError.js';
import { isValidStatusTransition, type UpdateCampaignDto } from '../schemas/campaign.schema.js';
import type { CampaignStatus } from '../types/campaign.js';

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

  /**
   * Get campaign details by ID
   * @throws NotFoundError if campaign not found
   */
  async getCampaignDetails(organisationId: string, campaignId: string): Promise<CampaignListItem> {
    logger.info({ organisationId, campaignId }, 'Fetching campaign details');

    const campaign = await this.campaignRepository.findById(organisationId, campaignId);

    if (!campaign) {
      logger.warn({ organisationId, campaignId }, 'Campaign not found');
      throw new NotFoundError('Campaign not found');
    }

    logger.info({ organisationId, campaignId }, 'Campaign details retrieved');
    return campaign;
  }

  /**
   * Update campaign with status transition validation
   * @throws NotFoundError if campaign not found
   * @throws ValidationError if status transition invalid
   */
  async updateCampaign(
    organisationId: string,
    campaignId: string,
    updates: UpdateCampaignDto,
  ): Promise<Campaign> {
    logger.info({ organisationId, campaignId, updates }, 'Updating campaign');

    // If status is being updated, validate transition
    if (updates.status) {
      // Fetch current campaign to check current status
      const currentCampaign = await this.campaignRepository.findById(organisationId, campaignId);

      if (!currentCampaign) {
        logger.warn({ organisationId, campaignId }, 'Campaign not found for update');
        throw new NotFoundError('Campaign not found');
      }

      // Validate status transition
      const isValid = isValidStatusTransition(
        currentCampaign.status as CampaignStatus,
        updates.status as CampaignStatus,
      );

      if (!isValid) {
        logger.warn(
          { organisationId, campaignId, from: currentCampaign.status, to: updates.status },
          'Invalid status transition',
        );
        throw new ValidationError(
          `Invalid status transition from ${currentCampaign.status} to ${updates.status}`,
        );
      }
    }

    // Perform update
    const updated = await this.campaignRepository.update(organisationId, campaignId, updates);

    if (!updated) {
      logger.warn({ organisationId, campaignId }, 'Campaign not found for update');
      throw new NotFoundError('Campaign not found');
    }

    logger.info({ organisationId, campaignId }, 'Campaign updated successfully');
    return updated;
  }
}
