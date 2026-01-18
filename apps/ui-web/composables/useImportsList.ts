/**
 * Composable for managing import uploads list
 * Fetches and tracks import uploads for a campaign
 */

export interface ImportUpload {
  id: string;
  campaignId: string;
  filename: string;
  fileSize: number;
  rowCount: number;
  status: string;
  uploadedAt: string;
}

export const useImportsList = (campaignId: string | Ref<string>, status?: string) => {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const imports = ref<ImportUpload[]>([]);

  // Ensure campaignId is reactive
  const campaignIdRef = isRef(campaignId) ? campaignId : ref(campaignId);

  /**
   * Fetch imports list from backend
   */
  const fetchImports = async () => {
    const currentCampaignId = unref(campaignIdRef);
    
    if (!currentCampaignId) {
      console.warn('Cannot fetch imports: campaignId is empty');
      return [];
    }

    loading.value = true;
    error.value = null;

    try {
      const params = status ? `?status=${status}` : '';
      const response = await $fetch<{ success: boolean; data: ImportUpload[] }>(
        `/api/campaigns/${currentCampaignId}/imports${params}`,
        { method: 'GET' }
      );

      if (!response.success) {
        throw new Error('Failed to fetch imports');
      }

      imports.value = response.data;
      return response.data;
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Erreur lors du chargement des imports';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Count of pending imports (uploaded status)
   */
  const pendingCount = computed(() => {
    return imports.value.filter((imp) => imp.status === 'uploaded').length;
  });

  /**
   * Format file size for display
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      uploaded: 'yellow',
      mapped: 'blue',
      validating: 'blue',
      validation_failed: 'red',
      importing: 'blue',
      completed: 'green',
      failed: 'red',
    };
    return colorMap[status] || 'gray';
  };

  /**
   * Get status label in French
   */
  const getStatusLabel = (status: string): string => {
    const labelMap: Record<string, string> = {
      uploaded: 'En attente de mapping',
      mapped: 'Mappé',
      validating: 'Validation en cours',
      validation_failed: 'Validation échouée',
      importing: 'Import en cours',
      completed: 'Complété',
      failed: 'Échoué',
    };
    return labelMap[status] || status;
  };

  /**
   * Delete an import
   */
  const deleteImport = async (uploadId: string): Promise<void> => {
    try {
      await $fetch(`/api/imports/${uploadId}`, {
        method: 'DELETE',
      });

      // Remove from local list
      imports.value = imports.value.filter((imp) => imp.id !== uploadId);
    } catch (err: any) {
      console.error('Failed to delete import:', err);
      throw err;
    }
  };

  return {
    loading,
    error,
    imports,
    pendingCount,
    fetchImports,
    deleteImport,
    formatFileSize,
    formatDate,
    getStatusColor,
    getStatusLabel,
  };
};
