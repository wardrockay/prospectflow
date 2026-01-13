import type { Ref } from 'vue';

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'paused' | 'completed';
  created_at: string;
  updated_at: string;
  prospect_count: number;
}

export interface CampaignListResponse {
  campaigns: Campaign[];
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
  status?: Ref<string | undefined>;
}

export const useCampaigns = (options: UseCampaignsOptions = {}) => {
  const config = useRuntimeConfig();
  const { page = ref(1), limit = 10, status = ref(undefined) } = options;

  // Build query params reactively
  const query = computed(() => {
    const params: Record<string, string | number> = {
      page: page.value,
      limit,
    };

    if (status.value) {
      params.status = status.value;
    }

    return params;
  });

  // Fetch campaigns with SSR support
  const { data, pending, error, refresh } = useFetch<CampaignListResponse>('/api/campaigns', {
    baseURL: config.public.apiBase,
    query,
    // Include credentials/cookies for authentication
    credentials: 'include',
    // Watch for query changes to refetch
    watch: [query],
  });

  const campaigns = computed(() => data.value?.campaigns || []);
  const pagination = computed(() => data.value?.pagination);

  return {
    campaigns,
    pagination,
    pending,
    error,
    refresh,
  };
};
