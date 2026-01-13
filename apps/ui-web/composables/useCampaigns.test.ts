import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useCampaigns } from './useCampaigns';
import type { CampaignListResponse } from './useCampaigns';

// Import setup to get globalThis type declarations
import '../tests/setup';

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
    globalThis.useFetch.mockReturnValue({
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
    globalThis.useFetch.mockReturnValue({
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

    globalThis.useFetch.mockReturnValue({
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

    globalThis.useFetch.mockReturnValue({
      data: ref(null),
      pending: ref(true),
      error: ref(null),
      refresh: vi.fn(),
    });

    useCampaigns({ page, limit: 20 });

    // New architecture: calls local Nuxt server API (no baseURL)
    // The Nuxt server then proxies to the campaign-api service
    expect(globalThis.useFetch).toHaveBeenCalledWith(
      '/api/campaigns',
      expect.objectContaining({
        credentials: 'include',
      })
    );

    // Verify baseURL is NOT passed (server proxy handles backend URL)
    const callArgs = (globalThis.useFetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(callArgs).not.toHaveProperty('baseURL');
  });
});
