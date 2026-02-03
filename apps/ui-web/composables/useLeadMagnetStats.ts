import type { Ref } from 'vue';

export interface LeadMagnetStats {
  total_signups: number;
  confirmed: number;
  confirmation_rate: number;
  unique_downloaders: number;
  total_downloads: number;
  avg_hours_to_confirm: number;
}

export interface UseLeadMagnetStatsOptions {
  period?: Ref<string>;
}

/**
 * Composable for fetching lead magnet analytics statistics
 * @param options - Configuration options including period filter
 * @returns Reactive stats data with refresh capability
 */
export const useLeadMagnetStats = (options: UseLeadMagnetStatsOptions = {}) => {
  const { period = ref('all') } = options;

  // Build query params reactively
  const query = computed(() => ({
    period: period.value,
  }));

  // Fetch stats from ingest-api via Nuxt server proxy
  const { data, pending, error, refresh } = useFetch<{
    success: boolean;
    data: LeadMagnetStats;
  }>('/api/admin/lead-magnet/stats', {
    query,
    credentials: 'include',
    // Transform response to extract data
    transform: (response) => response?.data,
  });

  return {
    stats: computed(() => data.value || null),
    loading: pending,
    error,
    refresh,
  };
};
