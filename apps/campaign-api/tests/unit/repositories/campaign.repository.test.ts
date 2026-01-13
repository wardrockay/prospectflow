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

    it('should calculate responseRate correctly for standard case', async () => {
      const mockCampaigns = [
        {
          id: 'campaign-1',
          organisationId: 'org-123',
          name: 'Campaign 1',
          valueProp: 'Value 1',
          status: 'running',
          totalProspects: 10,
          emailsSent: 10,
          responseCount: 4,
          responseRate: 40.0, // 4/10 * 100 = 40%
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      mockPool.query.mockResolvedValueOnce({ rows: mockCampaigns });

      const result = await repository.findAll('org-123', {});

      // Verify responseRate calculation matches SQL formula
      const campaign = result.campaigns[0];
      const expectedRate = (campaign.responseCount / campaign.emailsSent) * 100;
      expect(campaign.responseRate).toBe(expectedRate);
    });

    it('should handle responseRate edge case: zero emails sent', async () => {
      const mockCampaigns = [
        {
          id: 'campaign-1',
          organisationId: 'org-123',
          name: 'Campaign 1',
          valueProp: 'Value 1',
          status: 'draft',
          totalProspects: 0,
          emailsSent: 0,
          responseCount: 0,
          responseRate: 0, // Should be 0, not NaN or error
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      mockPool.query.mockResolvedValueOnce({ rows: mockCampaigns });

      const result = await repository.findAll('org-123', {});

      expect(result.campaigns[0].responseRate).toBe(0);
    });

    it('should handle responseRate edge case: 100% response rate', async () => {
      const mockCampaigns = [
        {
          id: 'campaign-1',
          organisationId: 'org-123',
          name: 'Campaign 1',
          valueProp: 'Value 1',
          status: 'running',
          totalProspects: 5,
          emailsSent: 5,
          responseCount: 5,
          responseRate: 100.0, // 5/5 * 100 = 100%
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      mockPool.query.mockResolvedValueOnce({ rows: mockCampaigns });

      const result = await repository.findAll('org-123', {});

      expect(result.campaigns[0].responseRate).toBe(100.0);
    });
  });

  describe('findById', () => {
    it('should return campaign with metrics', async () => {
      const mockCampaign = {
        id: 'campaign-1',
        organisationId: 'org-123',
        name: 'Test Campaign',
        valueProp: 'Test value',
        status: 'draft',
        totalProspects: 10,
        emailsSent: 5,
        responseCount: 2,
        responseRate: 40.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockCampaign] });

      const result = await repository.findById('org-123', 'campaign-1');

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('WHERE c.organisation_id = $1');
      expect(queryCall[0]).toContain('AND c.id = $2');
      expect(queryCall[1]).toEqual(['org-123', 'campaign-1']);
      expect(result).toEqual(mockCampaign);
    });

    it('should return null when campaign not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findById('org-123', 'nonexistent');

      expect(result).toBeNull();
    });

    it('should include LEFT JOINs for metrics', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{}] });

      await repository.findById('org-123', 'campaign-1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN outreach.tasks'),
        expect.any(Array),
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN crm.people'),
        expect.any(Array),
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN outreach.messages'),
        expect.any(Array),
      );
    });
  });

  describe('update', () => {
    it('should update name field', async () => {
      const mockUpdated = {
        id: 'campaign-1',
        organisationId: 'org-123',
        name: 'Updated Name',
        valueProp: 'Original value',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockUpdated] });

      const result = await repository.update('org-123', 'campaign-1', { name: 'Updated Name' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SET name = $3'),
        expect.arrayContaining(['org-123', 'campaign-1', 'Updated Name']),
      );
      expect(result).toEqual(mockUpdated);
    });

    it('should update multiple fields', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{}] });

      await repository.update('org-123', 'campaign-1', {
        name: 'New Name',
        valueProp: 'New value',
        status: 'running',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SET name = $3, value_prop = $4, status = $5'),
        expect.arrayContaining(['org-123', 'campaign-1', 'New Name', 'New value', 'running']),
      );
    });

    it('should update updated_at timestamp', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{}] });

      await repository.update('org-123', 'campaign-1', { name: 'New' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = now()'),
        expect.any(Array),
      );
    });

    it('should return null when campaign not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await repository.update('org-123', 'nonexistent', { name: 'New' });

      expect(result).toBeNull();
    });

    it('should use RETURNING clause', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{}] });

      await repository.update('org-123', 'campaign-1', { name: 'New' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('RETURNING'),
        expect.any(Array),
      );
    });
  });

  describe('Archive Filtering', () => {
    describe('findAll with includeArchived=false (default)', () => {
      it('should exclude archived campaigns from count query', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await repository.findAll('org-123', { includeArchived: false });

        // Verify count query includes status filter
        const countQuery = mockPool.query.mock.calls[0][0];
        expect(countQuery).toContain("AND c.status != 'archived'");
      });

      it('should exclude archived campaigns from results query', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await repository.findAll('org-123', { includeArchived: false });

        // Verify SELECT query includes status filter
        const selectQuery = mockPool.query.mock.calls[1][0];
        expect(selectQuery).toContain("AND c.status != 'archived'");
      });

      it('should use default includeArchived=false when not specified', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await repository.findAll('org-123', {});

        // Default behavior should exclude archived
        const countQuery = mockPool.query.mock.calls[0][0];
        expect(countQuery).toContain("AND c.status != 'archived'");
      });

      it('should work with pagination when archived campaigns exist', async () => {
        // Simulate 20 non-archived campaigns (out of 30 total with 10 archived)
        mockPool.query.mockResolvedValueOnce({ rows: [{ count: '20' }] });
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const result = await repository.findAll('org-123', {
          page: 1,
          limit: 10,
          includeArchived: false,
        });

        expect(result.pagination.totalItems).toBe(20);
        expect(result.pagination.totalPages).toBe(2);
      });
    });

    describe('findAll with includeArchived=true', () => {
      it('should NOT add status filter to count query', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await repository.findAll('org-123', { includeArchived: true });

        const countQuery = mockPool.query.mock.calls[0][0];
        expect(countQuery).not.toContain("c.status != 'archived'");
      });

      it('should NOT add status filter to results query', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await repository.findAll('org-123', { includeArchived: true });

        const selectQuery = mockPool.query.mock.calls[1][0];
        expect(selectQuery).not.toContain("c.status != 'archived'");
      });

      it('should include archived campaigns in results', async () => {
        const mockCampaigns = [
          {
            id: 'active-1',
            organisationId: 'org-123',
            name: 'Active Campaign',
            status: 'running',
            totalProspects: 10,
            emailsSent: 5,
            responseCount: 2,
            responseRate: 40.0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'archived-1',
            organisationId: 'org-123',
            name: 'Archived Campaign',
            status: 'archived',
            totalProspects: 5,
            emailsSent: 2,
            responseCount: 1,
            responseRate: 50.0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        mockPool.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
        mockPool.query.mockResolvedValueOnce({ rows: mockCampaigns });

        const result = await repository.findAll('org-123', { includeArchived: true });

        expect(result.campaigns).toHaveLength(2);
        expect(result.campaigns[0].status).toBe('running');
        expect(result.campaigns[1].status).toBe('archived');
      });
    });

    describe('Multi-tenant isolation with archive filter', () => {
      it('should enforce organisation_id filter with includeArchived=false', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await repository.findAll('org-123', { includeArchived: false });

        const countQuery = mockPool.query.mock.calls[0][0];
        expect(countQuery).toContain('WHERE c.organisation_id = $1');
        expect(mockPool.query.mock.calls[0][1]).toContain('org-123');
      });

      it('should enforce organisation_id filter with includeArchived=true', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await repository.findAll('org-123', { includeArchived: true });

        const countQuery = mockPool.query.mock.calls[0][0];
        expect(countQuery).toContain('WHERE c.organisation_id = $1');
        expect(mockPool.query.mock.calls[0][1]).toContain('org-123');
      });
    });
  });
});
