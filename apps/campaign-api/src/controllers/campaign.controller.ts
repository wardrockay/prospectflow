import type { Request, Response, NextFunction } from 'express';
import {
  createCampaignSchema,
  listCampaignsQuerySchema,
  updateCampaignSchema,
} from '../schemas/campaign.schema.js';
import { CampaignService } from '../services/campaign.service.js';
import { ValidationError } from '../errors/ValidationError.js';
import {
  campaignsCreatedTotal,
  campaignsListTotal,
  campaignsListDuration,
  campaignDetailsTotal,
  campaignDetailsDuration,
  campaignUpdateTotal,
  campaignUpdateDuration,
} from '../config/metrics.js';

export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  /**
   * UUID validation helper
   */
  private isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  createCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const parseResult = createCampaignSchema.safeParse(req.body);

      if (!parseResult.success) {
        req.log.warn(
          { errors: parseResult.error.flatten() },
          'Campaign creation validation failed',
        );
        throw new ValidationError('Invalid campaign data', parseResult.error.flatten().fieldErrors);
      }

      const { name, valueProp, templateId } = parseResult.data;
      const organisationId = req.organisationId!;

      req.log.info({ organisationId, campaignName: name }, 'Creating campaign');

      const campaign = await this.campaignService.createCampaign(organisationId, {
        name,
        valueProp,
        templateId,
      });

      // Track metric
      campaignsCreatedTotal.inc({ organisation_id: organisationId, success: 'true' });

      req.log.info({ organisationId, campaignId: campaign.id }, 'Campaign created');

      res.status(201).json({
        success: true,
        data: campaign,
        message: 'Campaign created successfully',
      });
    } catch (error) {
      // Track failure metric
      campaignsCreatedTotal.inc({
        organisation_id: req.organisationId || 'unknown',
        success: 'false',
      });
      next(error);
    }
  };

  listCampaigns = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    const organisationId = req.organisationId || 'unknown';

    try {
      // Validate query parameters
      const parseResult = listCampaignsQuerySchema.safeParse(req.query);

      if (!parseResult.success) {
        req.log.warn({ errors: parseResult.error.flatten() }, 'List campaigns validation failed');
        campaignsListTotal.inc({ organisation_id: organisationId, success: 'false' });
        throw new ValidationError(
          'Invalid query parameters',
          parseResult.error.flatten().fieldErrors,
        );
      }

      const params = parseResult.data;

      req.log.info({ organisationId, ...params }, 'Fetching campaigns list');

      const result = await this.campaignService.listCampaigns(organisationId, params);

      // Track metrics
      const duration = (Date.now() - startTime) / 1000;
      campaignsListTotal.inc({ organisation_id: organisationId, success: 'true' });
      campaignsListDuration.observe({ organisation_id: organisationId }, duration);

      req.log.info(
        { organisationId, totalItems: result.pagination.totalItems },
        'Campaigns list retrieved',
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      campaignsListTotal.inc({ organisation_id: organisationId, success: 'false' });
      next(error);
    }
  };

  /**
   * Get single campaign details
   * GET /api/v1/campaigns/:id
   */
  getCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    const organisationId = req.organisationId || 'unknown';

    try {
      const { id: campaignId } = req.params;

      // Validate UUID format
      if (!this.isValidUUID(campaignId)) {
        req.log.warn({ campaignId }, 'Invalid campaign ID format');
        campaignDetailsTotal.inc({ organisation_id: organisationId, success: 'false' });
        throw new ValidationError('Invalid campaign ID format');
      }

      req.log.info({ organisationId, campaignId }, 'Fetching campaign details');

      const campaign = await this.campaignService.getCampaignDetails(organisationId, campaignId);

      // Track metrics
      const duration = (Date.now() - startTime) / 1000;
      campaignDetailsTotal.inc({ organisation_id: organisationId, success: 'true' });
      campaignDetailsDuration.observe({ organisation_id: organisationId }, duration);

      req.log.info({ organisationId, campaignId }, 'Campaign details retrieved');

      res.status(200).json({
        success: true,
        data: campaign,
      });
    } catch (error) {
      campaignDetailsTotal.inc({ organisation_id: organisationId, success: 'false' });
      next(error);
    }
  };

  /**
   * Update campaign (inline editing)
   * PATCH /api/v1/campaigns/:id
   */
  updateCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    const organisationId = req.organisationId || 'unknown';

    try {
      const { id: campaignId } = req.params;

      // Validate UUID format
      if (!this.isValidUUID(campaignId)) {
        req.log.warn({ campaignId }, 'Invalid campaign ID format');
        campaignUpdateTotal.inc({ organisation_id: organisationId, success: 'false' });
        throw new ValidationError('Invalid campaign ID format');
      }

      // Validate request body
      const parseResult = updateCampaignSchema.safeParse(req.body);

      if (!parseResult.success) {
        req.log.warn({ errors: parseResult.error.flatten() }, 'Update campaign validation failed');
        campaignUpdateTotal.inc({ organisation_id: organisationId, success: 'false' });
        throw new ValidationError('Invalid campaign data', parseResult.error.flatten().fieldErrors);
      }

      const updates = parseResult.data;

      req.log.info({ organisationId, campaignId, updates }, 'Updating campaign');

      const updated = await this.campaignService.updateCampaign(
        organisationId,
        campaignId,
        updates,
      );

      // Track metrics
      const duration = (Date.now() - startTime) / 1000;
      campaignUpdateTotal.inc({ organisation_id: organisationId, success: 'true' });
      campaignUpdateDuration.observe({ organisation_id: organisationId }, duration);

      req.log.info({ organisationId, campaignId }, 'Campaign updated successfully');

      res.status(200).json({
        success: true,
        data: updated,
        message: 'Campaign updated successfully',
      });
    } catch (error) {
      campaignUpdateTotal.inc({ organisation_id: organisationId, success: 'false' });
      next(error);
    }
  };
}
