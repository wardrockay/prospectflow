import type { Ref } from 'vue';

export interface SubscriberListItem {
  id: string;
  email: string;
  status: 'pending' | 'confirmed' | 'unsubscribed' | 'bounced';
  source: string | null;
  created_at: string;
  confirmed_at: string | null;
  download_count: number;
}

export interface PaginatedResult {
  data: SubscriberListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UseSubscribersOptions {
  page?: Ref<number>;
  limit?: number;
  search?: Ref<string>;
  sortBy?: Ref<string>;
  sortOrder?: Ref<'asc' | 'desc'>;
}

/**
 * Composable for managing lead magnet subscribers list
 * Provides pagination, search, and sort capabilities
 */
export const useSubscribers = (options: UseSubscribersOptions = {}) => {
  const {
    page = ref(1),
    limit = 25,
    search = ref(''),
    sortBy = ref('created_at'),
    sortOrder = ref<'asc' | 'desc'>('desc'),
  } = options;

  // Build query params reactively
  const query = computed(() => {
    const params: Record<string, string | number> = {
      page: page.value,
      limit,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    };

    if (search.value?.trim()) {
      params.search = search.value.trim();
    }

    return params;
  });

  // Fetch subscribers from ingest-api via Nuxt server proxy
  const { data, pending, error, refresh } = useFetch<{
    success: boolean;
    data: PaginatedResult;
  }>('/api/admin/lead-magnet/subscribers', {
    query,
    credentials: 'include',
    transform: (response) => response?.data,
  });

  /**
   * Delete a subscriber (RGPD compliance)
   */
  const deleteSubscriber = async (id: string): Promise<boolean> => {
    try {
      const response = await $fetch<{ success: boolean }>(
        `/api/admin/lead-magnet/subscribers/${id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      );

      if (response.success) {
        // Refresh the list after successful deletion
        await refresh();
        return true;
      }

      return false;
    } catch (err) {
      console.error('Failed to delete subscriber:', err);
      return false;
    }
  };

  /**
   * Export subscribers to CSV
   */
  const exportToCsv = async (): Promise<void> => {
    try {
      const queryParams = new URLSearchParams();
      if (search.value?.trim()) {
        queryParams.set('search', search.value.trim());
      }

      // Trigger browser download
      window.location.href = `/api/admin/lead-magnet/subscribers/export?${queryParams.toString()}`;
    } catch (err) {
      console.error('Failed to export subscribers:', err);
      throw err;
    }
  };

  return {
    subscribers: computed(() => data.value?.data || []),
    total: computed(() => data.value?.total || 0),
    totalPages: computed(() => data.value?.totalPages || 1),
    page,
    limit,
    search,
    sortBy,
    sortOrder,
    loading: pending,
    error,
    refresh,
    deleteSubscriber,
    exportToCsv,
  };
};
