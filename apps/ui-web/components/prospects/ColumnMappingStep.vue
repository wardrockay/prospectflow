<template>
  <div class="column-mapping-step">
    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold">Column Mapping</h3>
        <p class="text-sm text-gray-600 mt-1">Map your CSV columns to the required fields</p>
      </template>

      <div class="space-y-4">
        <!-- Column Mappings List -->
        <div v-for="mapping in mappings" :key="mapping.detected" class="mapping-row">
          <div class="flex items-center gap-4">
            <!-- Detected Column -->
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ mapping.detected }}
              </label>
              <UBadge :color="confidenceColor(mapping.confidence)" variant="subtle" size="xs">
                {{ mapping.confidence }} confidence
              </UBadge>
            </div>

            <!-- Arrow -->
            <UIcon name="i-heroicons-arrow-right" class="text-gray-400" />

            <!-- Target Column -->
            <div class="flex-1">
              <USelect
                v-model="mapping.suggested"
                :options="targetColumns"
                placeholder="Select target column"
                :disabled="!mapping.suggested && mapping.confidence === 'low'"
              />
              <span v-if="mapping.required" class="text-xs text-red-600 mt-1 block">
                Required
              </span>
            </div>
          </div>
        </div>

        <!-- Preview Section -->
        <div v-if="preview.length > 0" class="mt-6">
          <h4 class="text-sm font-semibold mb-2">Preview (First 3 rows)</h4>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th
                    v-for="col in mappedColumns"
                    :key="col"
                    class="px-4 py-2 text-left font-medium text-gray-700"
                  >
                    {{ col }}
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr v-for="(row, idx) in preview" :key="idx">
                  <td v-for="col in mappedColumns" :key="col" class="px-4 py-2 text-gray-900">
                    {{ row[col] || '-' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Validation Errors -->
        <UAlert
          v-if="!validation.valid"
          color="red"
          variant="soft"
          title="Missing Required Columns"
          :description="`Please map: ${validation.missing.join(', ')}`"
        />
      </div>

      <template #footer>
        <div class="flex justify-between">
          <UButton color="gray" variant="ghost" @click="$emit('back')"> Back </UButton>
          <UButton
            color="primary"
            :disabled="!validation.valid"
            @click="$emit('confirm', getColumnMappings())"
          >
            Continue
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
    preview?: Array<Record<string, string>>;
  }

  const props = defineProps<Props>();

  const emit = defineEmits<{
    back: [];
    confirm: [mappings: Record<string, string>];
  }>();

  const targetColumns = [
    { label: 'Company Name', value: 'company_name' },
    { label: 'Contact Email', value: 'contact_email' },
    { label: 'Contact Name', value: 'contact_name' },
    { label: 'Website URL', value: 'website_url' },
  ];

  const mappedColumns = computed(() => {
    return props.mappings.filter((m) => m.suggested).map((m) => m.suggested);
  });

  const confidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'green';
      case 'medium':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  const getColumnMappings = (): Record<string, string> => {
    const mappings: Record<string, string> = {};
    props.mappings.forEach((m) => {
      if (m.suggested) {
        mappings[m.detected] = m.suggested;
      }
    });
    return mappings;
  };
</script>

<style scoped>
  .mapping-row {
    @apply p-4 border border-gray-200 rounded-lg bg-gray-50;
  }
</style>
