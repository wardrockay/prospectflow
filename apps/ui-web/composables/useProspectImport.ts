/**
 * Prospect import composable
 * Handles CSV file upload logic and validation
 */

interface UploadResult {
  uploadId: string;
  filename: string;
  fileSize: number;
  rowCount: number;
  uploadedAt: string;
}

export const useProspectImport = (campaignId: string) => {
  const file = ref<File | null>(null);
  const uploading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Formatted file size
   */
  const fileSize = computed(() => {
    if (!file.value) return '';

    const bytes = file.value.size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  });

  /**
   * Can continue to upload
   */
  const canContinue = computed(() => {
    return file.value !== null && !error.value && !uploading.value;
  });

  /**
   * Select file and validate
   */
  const selectFile = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const selectedFile = input.files?.[0];

    if (!selectedFile) {
      return;
    }

    // Reset error
    error.value = null;

    // Validate file type
    if (!selectedFile.name.endsWith('.csv') && selectedFile.type !== 'text/csv') {
      error.value = 'Veuillez uploader un fichier CSV (.csv)';
      file.value = null;
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      error.value = 'Fichier trop volumineux. Taille maximale : 5 MB (environ 5000 prospects)';
      file.value = null;
      return;
    }

    file.value = selectedFile;
  };

  /**
   * Clear selected file
   */
  const clearFile = () => {
    file.value = null;
    error.value = null;
  };

  /**
   * Upload file to backend
   */
  const uploadFile = async (): Promise<UploadResult> => {
    if (!file.value) {
      throw new Error('Aucun fichier sélectionné');
    }

    uploading.value = true;
    error.value = null;

    try {
      const formData = new FormData();
      formData.append('file', file.value);

      const response = await $fetch<{ success: boolean; data: UploadResult }>(
        `/api/campaigns/${campaignId}/prospects/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.success) {
        throw new Error("Échec de l'upload");
      }

      return response.data;
    } catch (err: any) {
      error.value = err.data?.message || err.message || "Erreur lors de l'upload";
      throw err;
    } finally {
      uploading.value = false;
    }
  };

  /**
   * Download CSV template
   */
  const downloadTemplate = async () => {
    try {
      // Use server proxy for authenticated download
      const link = document.createElement('a');
      link.href = '/api/campaigns/prospects/template';
      link.download = 'prospect_import_template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('Template download failed:', err);
      throw err;
    }
  };

  return {
    file,
    uploading,
    error,
    fileSize,
    canContinue,
    selectFile,
    clearFile,
    uploadFile,
    downloadTemplate,
  };
};
