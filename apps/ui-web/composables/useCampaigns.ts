import type { Ref } from 'vue';

export interface CampaignListItem {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'paused' | 'completed';
  created_at: string;
  updated_at: string;
  prospect_count: number;
}

export interface CampaignListResponse {
  campaigns: CampaignListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UseCampaignsOptions {
  page?: Ref<number>;
  limit?: number;
}

export const useCampaigns = (options: UseCampaignsOptions = {}) => {
  const { page = ref(1), limit = 10 } = options;

  // Build query params reactively
  const query = computed(() => {
    const params: Record<string, string | number> = {
      page: page.value,
      limit,
    };

    return params;
  });

  // Fetch campaigns via Nuxt server API (which proxies to campaign-api)
  // No need for baseURL - calls local Nuxt server /api/campaigns
  // Authentication is handled server-side using cookies
  const { data, pending, error, refresh } = useFetch('/api/campaigns', {
    query,
    // Include credentials/cookies for server-side auth
    credentials: 'include',
    // Watch for query changes to refetch
    watch: [query],
  });

  // Cast data to expected type
  const typedData = data as Ref<CampaignListResponse | null>;

  const campaigns = computed(() => typedData.value?.campaigns || []);
  const pagination = computed(() => typedData.value?.pagination);

  return {
    campaigns,
    pagination,
    pending,
    error,
    refresh,
  };
};
