import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CampaignService } from '../../../src/services/campaign.service.js';
import { NotFoundError } from '../../../src/errors/http-errors.js';
import { ValidationError } from '../../../src/errors/ValidationError.js';

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
      findById: vi.fn(),
      update: vi.fn(),
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

  describe('getCampaignDetails', () => {
    it('should return campaign from repository', async () => {
      const mockCampaign = { id: 'campaign-1', name: 'Test' };
      mockRepository.findById.mockResolvedValue(mockCampaign);

      const result = await service.getCampaignDetails('org-123', 'campaign-1');

      expect(mockRepository.findById).toHaveBeenCalledWith('org-123', 'campaign-1');
      expect(result).toEqual(mockCampaign);
    });

    it('should throw NotFoundError when campaign not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getCampaignDetails('org-123', 'nonexistent')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('updateCampaign', () => {
    it('should update campaign without status change', async () => {
      const mockUpdated = { id: 'campaign-1', name: 'Updated' };
      mockRepository.update.mockResolvedValue(mockUpdated);

      const result = await service.updateCampaign('org-123', 'campaign-1', { name: 'Updated' });

      expect(mockRepository.update).toHaveBeenCalledWith('org-123', 'campaign-1', {
        name: 'Updated',
      });
      expect(result).toEqual(mockUpdated);
    });

    it('should validate status transition when status provided', async () => {
      const mockCurrent = { id: 'campaign-1', status: 'draft' };
      const mockUpdated = { id: 'campaign-1', status: 'running' };

      mockRepository.findById.mockResolvedValue(mockCurrent);
      mockRepository.update.mockResolvedValue(mockUpdated);

      const result = await service.updateCampaign('org-123', 'campaign-1', { status: 'running' });

      expect(mockRepository.findById).toHaveBeenCalledWith('org-123', 'campaign-1');
      expect(result).toEqual(mockUpdated);
    });

    it('should throw ValidationError for invalid status transition', async () => {
      const mockCurrent = { id: 'campaign-1', status: 'archived' };
      mockRepository.findById.mockResolvedValue(mockCurrent);

      await expect(
        service.updateCampaign('org-123', 'campaign-1', { status: 'running' }),
      ).rejects.toThrow('Invalid status transition');
    });

    it('should throw NotFoundError when campaign not found during status check', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateCampaign('org-123', 'nonexistent', { status: 'running' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when update returns null', async () => {
      mockRepository.update.mockResolvedValue(null);

      await expect(
        service.updateCampaign('org-123', 'campaign-1', { name: 'New' }),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
