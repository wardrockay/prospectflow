import type { ValidationResult, ImportSummary } from '~/types/validation.types';

/**
 * Composable for managing validation results and import execution
 * 
 * Handles:
 * - Fetching validation results from backend
 * - Managing validation state (loading, error, validationResult)
 * - Executing import via API
 * - Tracking import progress
 * - Error handling with French messages
 * 
 * @param uploadId - The unique identifier for the uploaded CSV file
 * @param campaignId - The campaign to associate imported prospects with
 * @returns Object containing validation state, import state, and methods
 */
export const useValidationResults = (uploadId: string, campaignId: string) => {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const validationResult = ref<ValidationResult | null>(null);
  const importing = ref(false);
  const importSummary = ref<ImportSummary | null>(null);

  /**
   * Fetch validation results from backend
   * POST /api/imports/:uploadId/validate-data
   */
  const fetchValidationResults = async (): Promise<ValidationResult> => {
    loading.value = true;
    error.value = null;

    try {
      const response = await $fetch<{ success: boolean; data: ValidationResult }>(
        `/api/imports/${uploadId}/validate-data`,
        {
          method: 'POST',
          body: { overrideDuplicates: false },
        }
      );

      validationResult.value = response.data;

      return response.data;
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de la validation des données';
      error.value = errorMessage;

      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Execute import with validated data
   * POST /api/prospects/import
   */
  const executeImport = async (): Promise<ImportSummary> => {
    if (!validationResult.value) {
      const errorMessage = 'Aucun résultat de validation disponible';
      throw new Error(errorMessage);
    }

    importing.value = true;
    error.value = null;

    try {
      const response = await $fetch<{ success: boolean; data: ImportSummary }>(
        '/api/prospects/import',
        {
          method: 'POST',
          body: {
            validationResult: validationResult.value,
            campaignId,
          },
        }
      );

      importSummary.value = response.data;

      return response.data;
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de l\'import des prospects';
      error.value = errorMessage;

      throw err;
    } finally {
      importing.value = false;
    }
  };

  return {
    // State
    loading,
    error,
    validationResult,
    importing,
    importSummary,
    
    // Methods
    fetchValidationResults,
    executeImport,
  };
};
