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
});
