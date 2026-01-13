import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CampaignController } from '../../../src/controllers/campaign.controller.js';

// Mock metrics
vi.mock('../../../src/config/metrics', () => ({
  campaignsCreatedTotal: { inc: vi.fn() },
}));

describe('CampaignController', () => {
  let controller: CampaignController;
  let mockService: any;
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    mockService = {
      createCampaign: vi.fn(),
    };
    controller = new CampaignController(mockService);

    mockReq = {
      body: {},
      organisationId: 'org-123',
      log: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();
  });

  describe('createCampaign', () => {
    it('should return 201 with created campaign', async () => {
      const mockCampaign = {
        id: 'campaign-123',
        name: 'Test Campaign',
      };

      mockReq.body = {
        name: 'Test Campaign',
        valueProp: 'Test value proposition',
      };
      mockService.createCampaign.mockResolvedValue(mockCampaign);

      await controller.createCampaign(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockCampaign,
        message: 'Campaign created successfully',
      });
    });

    it('should return validation error for invalid input', async () => {
      mockReq.body = {
        name: '', // Invalid: empty
        valueProp: 'Valid',
      };

      await controller.createCampaign(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Campaign name is required'),
        }),
      );
    });

    it('should return validation error for name too long', async () => {
      mockReq.body = {
        name: 'a'.repeat(101),
        valueProp: 'Valid',
      };

      await controller.createCampaign(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
