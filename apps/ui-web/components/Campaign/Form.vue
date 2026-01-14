<script setup lang="ts">
  import type { CampaignFormData } from '~/composables/useCampaignForm';

  interface Props {
    mode: 'create' | 'edit';
    initialData?: Partial<CampaignFormData>;
    campaignId?: string; // Required when mode is 'edit'
  }

  const props = defineProps<Props>();

  const emit = defineEmits<{
    success: [campaignId: string];
    cancel: [];
  }>();

  // Initialize form with composable
  const { form, errors, isSubmitting, isValid, validateField, submitForm } = useCampaignForm(
    props.initialData,
    props.mode,
    props.campaignId
  );

  // Character count computed properties
  const nameCharCount = computed(() => form.value.name.length);
  const valuePropCharCount = computed(() => form.value.valueProp.length);

  // Character counter color classes
  const getCounterColor = (current: number, max: number) => {
    if (current >= max) return 'text-red-600';
    if (current >= max * 0.9) return 'text-amber-600';
    return 'text-gray-500';
  };

  // Toast for notifications
  const toast = useToast();

  /**
   * Handle field blur validation
   */
  const handleBlur = (field: keyof CampaignFormData) => {
    validateField(field);
  };

  /**
   * Focus on the first invalid field
   * Called when form validation fails on submit
   */
  const focusFirstInvalidField = () => {
    if (errors.value.name) {
      document.getElementById('campaign-name')?.focus();
    } else if (errors.value.valueProp) {
      document.getElementById('campaign-value-prop')?.focus();
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    try {
      const response = await submitForm();

      // Show success toast with dynamic message based on mode
      toast.add({
        title: 'Succès',
        description:
          props.mode === 'create'
            ? 'Campagne créée avec succès'
            : 'Campagne mise à jour avec succès',
        color: 'green',
        icon: 'i-heroicons-check-circle',
      });

      // Emit success event with campaign ID
      // Proxy now extracts data, so response is directly { id, name, ... }
      if (response && typeof response === 'object' && 'id' in response) {
        emit('success', response.id as string);
      }
    } catch (error: any) {
      // Focus on first invalid field if validation error
      if (error.message === 'Validation failed') {
        focusFirstInvalidField();
        return;
      }

      // Show error toast for API errors
      if (errors.value.form) {
        toast.add({
          title: 'Erreur',
          description: errors.value.form,
          color: 'red',
          icon: 'i-heroicons-exclamation-triangle',
        });
      }
    }
  };

  /**
   * Handle cancel action
   */
  const handleCancel = () => {
    emit('cancel');
  };
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Form-level error alert -->
    <UAlert
      v-if="errors.form"
      color="red"
      variant="soft"
      :title="errors.form"
      icon="i-heroicons-exclamation-triangle"
      :close-button="{ icon: 'i-heroicons-x-mark-20-solid', color: 'red', variant: 'link' }"
      @close="errors.form = undefined"
    />

    <!-- Name field -->
    <div class="space-y-2">
      <label for="campaign-name" class="block text-sm font-medium text-gray-900">
        Nom de la campagne <span class="text-red-600">*</span>
      </label>
      <UInput
        id="campaign-name"
        v-model="form.name"
        type="text"
        placeholder="Ex: Campagne de prospection Q1 2026"
        maxlength="100"
        :error="!!errors.name"
        aria-required="true"
        :aria-describedby="errors.name ? 'name-error' : 'name-helper'"
        @blur="handleBlur('name')"
      />
      <div class="flex justify-between items-start">
        <p
          v-if="errors.name"
          id="name-error"
          class="text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          {{ errors.name }}
        </p>
        <p v-else id="name-helper" class="text-sm text-gray-500">&nbsp;</p>
        <p :class="['text-sm font-medium', getCounterColor(nameCharCount, 100)]">
          {{ nameCharCount }}/100
        </p>
      </div>
    </div>

    <!-- Value Proposition field -->
    <div class="space-y-2">
      <label for="campaign-value-prop" class="block text-sm font-medium text-gray-900">
        Proposition de valeur <span class="text-gray-400 text-xs">(optionnel)</span>
      </label>
      <UTextarea
        id="campaign-value-prop"
        v-model="form.valueProp"
        placeholder="Ex: Augmenter vos ventes de 30% grâce à notre solution..."
        :rows="3"
        maxlength="150"
        :error="!!errors.valueProp"
        :aria-describedby="errors.valueProp ? 'valueProp-error' : 'valueProp-helper'"
        @blur="handleBlur('valueProp')"
      />
      <div class="flex justify-between items-start">
        <p
          v-if="errors.valueProp"
          id="valueProp-error"
          class="text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          {{ errors.valueProp }}
        </p>
        <p v-else id="valueProp-helper" class="text-sm text-gray-500">&nbsp;</p>
        <p :class="['text-sm font-medium', getCounterColor(valuePropCharCount, 150)]">
          {{ valuePropCharCount }}/150
        </p>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="flex items-center gap-3 pt-4">
      <UButton
        type="submit"
        color="primary"
        size="lg"
        :loading="isSubmitting"
        :disabled="!isValid || isSubmitting"
      >
        {{ mode === 'create' ? 'Créer' : 'Enregistrer' }}
      </UButton>
      <UButton
        type="button"
        color="gray"
        variant="ghost"
        size="lg"
        :disabled="isSubmitting"
        @click="handleCancel"
      >
        Annuler
      </UButton>
    </div>
  </form>
</template>
