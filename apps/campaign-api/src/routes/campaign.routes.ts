import { Router } from 'express';
import { CampaignController } from '../controllers/campaign.controller.js';
import { CampaignService } from '../services/campaign.service.js';
import { CampaignRepository } from '../repositories/campaign.repository.js';
import { getPool } from '../config/database.js';

const router = Router();

// Initialize dependencies
const pool = getPool();
const campaignRepository = new CampaignRepository(pool);
const campaignService = new CampaignService(campaignRepository);
const campaignController = new CampaignController(campaignService);

// Routes - Authentication applied at router level in index.ts
// List campaigns (must be BEFORE /:id routes to avoid conflicts)
router.get('/', campaignController.listCampaigns);
router.post('/', campaignController.createCampaign);

export { router as campaignRoutes };
