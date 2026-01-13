import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CampaignRepository } from '../../../src/repositories/campaign.repository.js';

// Mock logger
vi.mock('../../../src/utils/logger', () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Mock metrics
vi.mock('../../../src/utils/metrics.utils', () => ({
  trackDatabaseQuery: vi.fn((_, __, fn) => fn()),
}));

describe('CampaignRepository', () => {
  let repository: CampaignRepository;
  let mockPool: any;

  beforeEach(() => {
    mockPool = {
      query: vi.fn(),
    };
    repository = new CampaignRepository(mockPool);
  });

  describe('create', () => {
    it('should insert campaign with organisation_id', async () => {
      const mockCampaign = {
        id: 'generated-uuid',
        organisationId: 'org-123',
        name: 'Test Campaign',
        valueProp: 'Test value',
        templateId: null,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPool.query.mockResolvedValue({ rows: [mockCampaign] });

      const result = await repository.create('org-123', {
        name: 'Test Campaign',
        valueProp: 'Test value',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO outreach.campaigns'),
        expect.arrayContaining(['org-123', 'Test Campaign', 'Test value']),
      );
      expect(result).toEqual(mockCampaign);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Connection failed'));

      await expect(
        repository.create('org-123', { name: 'Test', valueProp: 'Test' }),
      ).rejects.toThrow('Connection failed');
    });
  });

  describe('findAll', () => {
    it('should return campaigns with metrics and pagination', async () => {
      const mockCampaigns = [
        {
          id: 'campaign-1',
          organisationId: 'org-123',
          name: 'Campaign 1',
          valueProp: 'Value 1',
          templateId: null,
          status: 'draft',
          totalProspects: 10,
          emailsSent: 5,
          responseCount: 2,
          responseRate: 40.0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Mock COUNT query
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      // Mock SELECT query
      mockPool.query.mockResolvedValueOnce({ rows: mockCampaigns });

      const result = await repository.findAll('org-123', {
        page: 1,
        limit: 25,
        sortBy: 'updatedAt',
        order: 'desc',
      });

      expect(mockPool.query).toHaveBeenCalledTimes(2); // COUNT + SELECT
      expect(result.campaigns).toEqual(mockCampaigns);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 25,
        totalItems: 1,
        totalPages: 1,
      });
    });

    it('should handle empty result', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findAll('org-123', {});

      expect(result.campaigns).toEqual([]);
      expect(result.pagination.totalItems).toBe(0);
    });

    it('should apply pagination correctly', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '100' }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findAll('org-123', { page: 2, limit: 25 });

      // Verify OFFSET calculation: (2-1) * 25 = 25
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        expect.arrayContaining(['org-123', 25, 25]),
      );
      expect(result.pagination.totalPages).toBe(4); // 100 / 25
    });
  });
});
