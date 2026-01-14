/**
 * Campaign form data interface
 * Matches backend schema: name (required), valueProp (required)
 */
export interface CampaignFormData {
  name: string;
  valueProp: string;
}

/**
 * Campaign form validation errors
 */
export interface CampaignFormErrors {
  name?: string;
  valueProp?: string;
  form?: string;
}

/**
 * Validation rules matching backend requirements
 */
const validationRules = {
  name: {
    required: 'Le nom est requis',
    maxLength: { value: 100, message: 'Le nom ne peut pas dépasser 100 caractères' },
  },
  valueProp: {
    maxLength: {
      value: 150,
      message: 'La proposition de valeur ne peut pas dépasser 150 caractères',
    },
  },
};

/**
 * Composable for managing campaign creation and editing form
 * Handles validation, submission, and error states
 * @param initialData - Initial form data (for pre-filling in edit mode)
 * @param mode - Form mode: 'create' or 'edit'
 * @param campaignId - Campaign ID (required when mode is 'edit')
 */
export const useCampaignForm = (
  initialData?: Partial<CampaignFormData>,
  mode: 'create' | 'edit' = 'create',
  campaignId?: string
) => {
  // Form reactive state
  const form = ref<CampaignFormData>({
    name: initialData?.name || '',
    valueProp: initialData?.valueProp || '',
  });

  // Error state
  const errors = ref<CampaignFormErrors>({});

  // Loading state
  const isSubmitting = ref(false);

  // Validation state
  const isValid = computed(() => {
    return (
      form.value.name.trim().length > 0 &&
      form.value.name.trim().length <= 100 &&
      form.value.valueProp.trim().length <= 150
    );
  });

  /**
   * Validate a single field
   */
  const validateField = (field: keyof CampaignFormData): boolean => {
    const value = form.value[field].trim();

    if (field === 'name') {
      if (value.length === 0) {
        errors.value.name = validationRules.name.required;
        return false;
      }
      if (value.length > validationRules.name.maxLength.value) {
        errors.value.name = validationRules.name.maxLength.message;
        return false;
      }
      errors.value.name = undefined;
      return true;
    } else if (field === 'valueProp') {
      // valueProp is optional, only validate max length
      if (value.length > validationRules.valueProp.maxLength.value) {
        errors.value.valueProp = validationRules.valueProp.maxLength.message;
        return false;
      }
      errors.value.valueProp = undefined;
      return true;
    }

    return false;
  };

  /**
   * Validate entire form
   */
  const validateForm = (): boolean => {
    const nameValid = validateField('name');
    const valuePropValid = validateField('valueProp');
    return nameValid && valuePropValid;
  };

  /**
   * Submit form to create or update campaign
   * Returns the created/updated campaign data or throws error
   */
  const submitForm = async () => {
    // Clear any previous form-level errors
    errors.value.form = undefined;

    // Validate before submission
    if (!validateForm()) {
      throw new Error('Validation failed');
    }

    isSubmitting.value = true;

    try {
      let response;

      if (mode === 'edit' && campaignId) {
        // PATCH request for edit mode
        response = await $fetch(`/api/campaigns/${campaignId}`, {
          method: 'PATCH',
          body: {
            name: form.value.name.trim(),
            valueProp: form.value.valueProp.trim() || null,
          },
        });
      } else {
        // POST request for create mode
        response = await $fetch('/api/campaigns', {
          method: 'POST',
          body: {
            name: form.value.name.trim(),
            valueProp: form.value.valueProp.trim(),
          },
        });
      }

      return response;
    } catch (error: any) {
      // Handle API errors
      if (error.statusCode === 400) {
        errors.value.form = error.data?.message || 'Données invalides';
      } else if (error.statusCode === 401) {
        errors.value.form = 'Session expirée. Veuillez vous reconnecter.';
      } else if (error.statusCode === 403) {
        errors.value.form = "Accès refusé. Vous n'avez pas les permissions nécessaires.";
      } else if (error.statusCode === 404 && mode === 'edit') {
        errors.value.form = 'Campagne introuvable';
      } else if (error.statusCode === 500) {
        errors.value.form = 'Erreur serveur. Veuillez réessayer.';
      } else {
        const defaultMsg =
          mode === 'edit'
            ? 'Erreur lors de la mise à jour de la campagne'
            : 'Erreur lors de la création de la campagne';
        errors.value.form = error.data?.message || defaultMsg;
      }
      throw error;
    } finally {
      isSubmitting.value = false;
    }
  };

  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    form.value = {
      name: initialData?.name || '',
      valueProp: initialData?.valueProp || '',
    };
    errors.value = {};
    isSubmitting.value = false;
  };

  return {
    form,
    errors,
    isSubmitting,
    isValid,
    validateField,
    validateForm,
    submitForm,
    resetForm,
  };
};
