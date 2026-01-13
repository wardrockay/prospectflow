import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CampaignService } from '../../../src/services/campaign.service.js';

// Mock logger
vi.mock('../../../src/utils/logger', () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('CampaignService', () => {
  let service: CampaignService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
    };
    service = new CampaignService(mockRepository);
  });

  describe('createCampaign', () => {
    it('should create campaign via repository', async () => {
      const mockCampaign = {
        id: 'campaign-123',
        organisationId: 'org-123',
        name: 'Test Campaign',
        valueProp: 'Test value',
        status: 'draft',
      };

      mockRepository.create.mockResolvedValue(mockCampaign);

      const result = await service.createCampaign('org-123', {
        name: 'Test Campaign',
        valueProp: 'Test value',
      });

      expect(mockRepository.create).toHaveBeenCalledWith('org-123', {
        name: 'Test Campaign',
        valueProp: 'Test value',
      });
      expect(result).toEqual(mockCampaign);
    });
  });
});
