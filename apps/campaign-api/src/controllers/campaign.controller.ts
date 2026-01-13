import type { Request, Response, NextFunction } from 'express';
import { createCampaignSchema } from '../schemas/campaign.schema.js';
import { CampaignService } from '../services/campaign.service.js';
import { ValidationError } from '../errors/ValidationError.js';
import { campaignsCreatedTotal } from '../config/metrics.js';

export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  createCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const parseResult = createCampaignSchema.safeParse(req.body);

      if (!parseResult.success) {
        req.log.warn(
          { errors: parseResult.error.flatten() },
          'Campaign creation validation failed',
        );
        const errorMessages = Object.entries(parseResult.error.flatten().fieldErrors)
          .map(([field, errors]) => `${field}: ${errors?.join(', ')}`)
          .join('; ');
        throw new ValidationError(errorMessages || 'Invalid campaign data');
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
}
