import type { ColumnMapping, ColumnDetectionResponse, ValidationResult } from '~/types/csv.types';

export const useColumnMapping = (uploadId: string) => {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const detectedColumns = ref<string[]>([]);
  const mappings = ref<ColumnMapping[]>([]);
  const validation = ref<ValidationResult>({ valid: false, missing: [] });
  const campaignId = ref<string>('');

  /**
   * Fetch column detection results from backend
   */
  const fetchColumnMappings = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await $fetch<{ success: boolean; data: ColumnDetectionResponse }>(
        `/api/imports/${uploadId}/columns`,
        { method: 'GET' }
      );

      detectedColumns.value = response.data.detectedColumns;
      mappings.value = response.data.suggestedMappings;
      validation.value = response.data.validation;
      campaignId.value = response.data.campaignId;

      return response.data;
    } catch (err: any) {
      error.value = err.message || 'Erreur lors de la récupération des colonnes';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Update a single column mapping
   */
  const updateMapping = (detectedColumn: string, suggestedField: string) => {
    const mapping = mappings.value.find((m) => m.detected === detectedColumn);
    if (mapping) {
      mapping.suggested = suggestedField;
      
      // Revalidate after change
      validateMappings();
    }
  };

  /**
   * Validate that all required fields are mapped
   */
  const validateMappings = () => {
    const requiredFields = ['company_name', 'contact_email'];
    const mappedFields = mappings.value
      .filter((m) => m.suggested)
      .map((m) => m.suggested);

    const missing = requiredFields.filter((field) => !mappedFields.includes(field));

    validation.value = {
      valid: missing.length === 0,
      missing,
    };
  };

  /**
   * Convert mappings array to object format for API
   */
  const getMappingsObject = (): Record<string, string> => {
    const result: Record<string, string> = {};
    mappings.value.forEach((m) => {
      if (m.suggested) {
        result[m.detected] = m.suggested;
      }
    });
    return result;
  };

  /**
   * Submit mappings to backend
   */
  const submitMappings = async () => {
    loading.value = true;
    error.value = null;

    try {
      const columnMappings = getMappingsObject();

      const response = await $fetch<{ success: boolean }>(
        `/api/imports/${uploadId}/map`,
        {
          method: 'POST',
          body: { columnMappings },
        }
      );

      return response;
    } catch (err: any) {
      error.value = err.message || 'Erreur lors de la sauvegarde des mappings';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    error,
    detectedColumns,
    mappings,
    validation,
    campaignId,
    fetchColumnMappings,
    updateMapping,
    validateMappings,
    submitMappings,
    getMappingsObject,
  };
};
