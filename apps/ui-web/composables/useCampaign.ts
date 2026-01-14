import type { Ref } from 'vue';

export interface Campaign {
  id: string;
  organisation_id: string;
  name: string;
  valueProp: string | null;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
  prospect_count: number;
  emails_sent?: number; // Optional field
}

export interface UseCampaignReturn {
  campaign: Ref<Campaign | null>;
  pending: Ref<boolean>;
  error: Ref<Error | null>;
  refresh: () => Promise<void>;
}

/**
 * Composable to fetch a single campaign by ID
 * @param campaignId - The campaign ID to fetch
 */
export const useCampaign = (campaignId: string) => {
  // Fetch campaign via Nuxt server API (which proxies to campaign-api)
  // No need for baseURL - calls local Nuxt server /api/campaigns/:id
  // Authentication is handled server-side using cookies
  const { data, pending, error, refresh } = useFetch(`/api/campaigns/${campaignId}`, {
    credentials: 'include',
    // Don't watch for changes - single fetch on mount
    watch: false,
    key: `campaign-${campaignId}`, // Cache key for this specific campaign
  });

  // Cast data to expected type
  const campaign = data as Ref<Campaign | null>;

  return {
    campaign,
    pending,
    error,
    refresh,
  };
};
