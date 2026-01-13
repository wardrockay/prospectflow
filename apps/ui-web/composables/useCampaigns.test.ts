import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useCampaigns } from './useCampaigns';
import type { CampaignListResponse } from './useCampaigns';

describe('useCampaigns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch campaigns with default options', () => {
    const mockData: CampaignListResponse = {
      campaigns: [
        {
          id: '1',
          name: 'Test Campaign',
          description: 'Test Description',
          status: 'active',
          created_at: '2026-01-13T10:00:00Z',
          updated_at: '2026-01-13T10:00:00Z',
          prospect_count: 10,
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    };

    // Mock useFetch to return test data
    (globalThis.useFetch as any).mockReturnValue({
      data: ref(mockData),
      pending: ref(false),
      error: ref(null),
      refresh: vi.fn(),
    });

    const { campaigns, pagination, pending, error } = useCampaigns();

    expect(campaigns.value).toEqual(mockData.campaigns);
    expect(pagination.value).toEqual(mockData.pagination);
    expect(pending.value).toBe(false);
    expect(error.value).toBeNull();
  });

  it('should return empty array when no data', () => {
    (globalThis.useFetch as any).mockReturnValue({
      data: ref(null),
      pending: ref(false),
      error: ref(null),
      refresh: vi.fn(),
    });

    const { campaigns } = useCampaigns();

    expect(campaigns.value).toEqual([]);
  });

  it('should handle API errors gracefully', () => {
    const mockError = new Error('API Error');

    (globalThis.useFetch as any).mockReturnValue({
      data: ref(null),
      pending: ref(false),
      error: ref(mockError),
      refresh: vi.fn(),
    });

    const { campaigns, error } = useCampaigns();

    expect(campaigns.value).toEqual([]);
    expect(error.value).toEqual(mockError);
  });

  it('should pass correct options to useFetch', () => {
    const page = ref(2);
    const status = ref('active');

    (globalThis.useFetch as any).mockReturnValue({
      data: ref(null),
      pending: ref(true),
      error: ref(null),
      refresh: vi.fn(),
    });

    useCampaigns({ page, limit: 20, status });

    expect(globalThis.useFetch).toHaveBeenCalledWith(
      '/api/campaigns',
      expect.objectContaining({
        baseURL: 'http://localhost:3001',
        credentials: 'include',
      })
    );
  });
});
