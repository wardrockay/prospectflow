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
      findAll: vi.fn(),
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

  describe('listCampaigns', () => {
    it('should return campaigns from repository', async () => {
      const mockResult = {
        campaigns: [
          {
            id: 'campaign-1',
            organisationId: 'org-123',
            name: 'Test',
            valueProp: 'Value',
            templateId: null,
            status: 'draft',
            totalProspects: 0,
            emailsSent: 0,
            responseCount: 0,
            responseRate: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        pagination: { page: 1, limit: 25, totalItems: 1, totalPages: 1 },
      };

      mockRepository.findAll.mockResolvedValue(mockResult);

      const result = await service.listCampaigns('org-123', { page: 1, limit: 25 });

      expect(mockRepository.findAll).toHaveBeenCalledWith('org-123', { page: 1, limit: 25 });
      expect(result).toEqual(mockResult);
    });
  });
});
