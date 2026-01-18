<template>
  <div class="column-mapper">
    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold">Mapping des colonnes</h3>
        <p class="text-sm text-gray-600 mt-1">
          Mappez les colonnes de votre CSV aux champs de votre CRM
        </p>
      </template>

      <div class="space-y-4">
        <!-- Column Mappings List -->
        <div
          v-for="mapping in mappings"
          :key="mapping.detected"
          class="p-4 border border-gray-200 rounded-lg bg-gray-50"
        >
          <div class="flex items-center gap-4">
            <!-- Detected Column -->
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ mapping.detected }}
              </label>
              <div class="flex items-center gap-2">
                <UBadge :color="getConfidenceColor(mapping.confidence)" variant="subtle" size="xs">
                  {{ getConfidenceLabel(mapping.confidence) }}
                </UBadge>
                <UIcon
                  v-if="mapping.confidence === 'high'"
                  name="i-heroicons-check-circle"
                  class="text-green-500"
                />
              </div>
            </div>

            <!-- Arrow -->
            <UIcon name="i-heroicons-arrow-right" class="text-gray-400 flex-shrink-0" />

            <!-- Target Column -->
            <div class="flex-1">
              <USelect
                :model-value="mapping.suggested"
                :options="fieldOptions"
                placeholder="Sélectionner un champ"
                :aria-required="mapping.required"
                @update:model-value="(value) => $emit('update-mapping', mapping.detected, value)"
              />
              <span v-if="mapping.required" class="text-xs text-red-600 mt-1 block">
                * Champ requis
              </span>
            </div>
          </div>
        </div>

        <!-- Validation Errors -->
        <UAlert
          v-if="!validation.valid"
          color="red"
          variant="soft"
          title="Champs requis manquants"
          role="alert"
          class="mt-4"
        >
          <template #description>
            <div>
              <p class="mb-2">Les champs suivants doivent être mappés :</p>
              <ul class="list-disc list-inside">
                <li v-for="field in validation.missing" :key="field" class="text-sm">
                  {{ getFieldLabel(field) }}
                </li>
              </ul>
            </div>
          </template>
        </UAlert>
      </div>

      <template #footer>
        <div class="flex justify-between">
          <UButton color="gray" variant="ghost" @click="$emit('back')">
            <UIcon name="i-heroicons-arrow-left" class="mr-1" />
            Retour
          </UButton>
          <UButton
            color="primary"
            :disabled="!validation.valid || loading"
            :loading="loading"
            @click="$emit('confirm')"
          >
            Valider le mapping
            <UIcon name="i-heroicons-arrow-right" class="ml-1" />
          </UButton>
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnMapping, ValidationResult } from '~/types/csv.types';

interface Props {
  mappings: ColumnMapping[];
  validation: ValidationResult;
  loading?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update-mapping': [detectedColumn: string, suggestedField: string];
  back: [];
  confirm: [];
}>();

/**
 * Field options grouped by entity type
 */
const fieldOptions = [
  {
    label: 'Champs entreprise',
    children: [
      { label: "Nom de l'entreprise", value: 'company_name' },
      { label: 'SIREN', value: 'company_siren' },
      { label: 'SIRET', value: 'company_siret' },
      { label: 'Site web', value: 'website_url' },
    ],
  },
  {
    label: 'Champs contact',
    children: [
      { label: 'Email', value: 'contact_email' },
      { label: 'Nom du contact', value: 'contact_name' },
      { label: 'Prénom', value: 'contact_first_name' },
      { label: 'Nom de famille', value: 'contact_last_name' },
      { label: 'Téléphone', value: 'contact_phone' },
    ],
  },
  {
    label: 'Autres',
    children: [
      { label: 'Ignorer cette colonne', value: '' },
      { label: 'Champ personnalisé', value: '__custom__' },
    ],
  },
];

/**
 * Get color for confidence badge
 */
const getConfidenceColor = (confidence: string) => {
  switch (confidence) {
    case 'high':
      return 'green';
    case 'medium':
      return 'yellow';
    default:
      return 'gray';
  }
};

/**
 * Get French label for confidence level
 */
const getConfidenceLabel = (confidence: string) => {
  switch (confidence) {
    case 'high':
      return 'Haute confiance';
    case 'medium':
      return 'Confiance moyenne';
    default:
      return 'Faible confiance';
  }
};

/**
 * Get human-readable label for field
 */
const getFieldLabel = (field: string): string => {
  const labels: Record<string, string> = {
    company_name: "Nom de l'entreprise",
    contact_email: 'Email du contact',
    company_siren: 'SIREN',
    website_url: 'Site web',
  };
  return labels[field] || field;
};
</script>
