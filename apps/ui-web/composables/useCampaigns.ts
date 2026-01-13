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
}

export const useCampaigns = (options: UseCampaignsOptions = {}) => {
  const config = useRuntimeConfig();
  const { page = ref(1), limit = 10 } = options;

  // Get access token from cookie for Authorization header
  const accessToken = useCookie('access_token');

  // Build query params reactively
  const query = computed(() => {
    const params: Record<string, string | number> = {
      page: page.value,
      limit,
    };

    return params;
  });

  // Build headers reactively to include auth token
  const headers = computed(() => {
    const h: Record<string, string> = {};
    if (accessToken.value) {
      h['Authorization'] = `Bearer ${accessToken.value}`;
    }
    return h;
  });

  // Fetch campaigns with SSR support
  const { data, pending, error, refresh } = useFetch('/api/campaigns', {
    baseURL: config.public.apiBase as string,
    query,
    headers,
    // Include credentials/cookies for authentication
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
