<template>
  <div class="validation-results-step">
    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold">Résultats de validation</h3>
        <p class="text-sm text-gray-600 mt-1">Vérifiez la qualité des données avant l'import</p>
      </template>

      <!-- Summary Section -->
      <div class="mb-6">
        <div class="grid" :class="hasDuplicates ? 'grid-cols-3 gap-3' : 'grid-cols-2 gap-4'">
          <!-- Valid Count -->
          <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <div class="text-3xl font-bold text-green-700">{{ validationResult.validCount }}</div>
            <div class="text-sm text-green-600">Lignes valides</div>
          </div>

          <!-- Invalid Count -->
          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="text-3xl font-bold text-red-700">{{ validationResult.invalidCount }}</div>
            <div class="text-sm text-red-600">Lignes invalides</div>
          </div>

          <!-- Duplicate Count -->
          <div v-if="hasDuplicates" class="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div class="text-3xl font-bold text-orange-700">{{ validationResult.duplicateCount }}</div>
            <div class="text-sm text-orange-600">Doublons détectés</div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="mt-4">
          <div class="flex justify-between text-sm mb-1">
            <span class="text-gray-600">Qualité des données</span>
            <span class="font-medium">{{ validPercentage }}% valides</span>
          </div>
          <div 
            class="w-full bg-gray-200 rounded-full h-2.5" 
            role="progressbar" 
            :aria-valuenow="validPercentage" 
            aria-valuemin="0" 
            aria-valuemax="100"
            :aria-label="`Qualité des données: ${validPercentage}% valides`"
          >
            <div
              class="h-2.5 rounded-full transition-all"
              :class="
                validPercentage >= 90
                  ? 'bg-green-600'
                  : validPercentage >= 50
                    ? 'bg-yellow-600'
                    : 'bg-red-600'
              "
              :style="{ width: validPercentage + '%' }"
            ></div>
          </div>
        </div>

        <!-- Warning if low quality -->
        <UAlert
          v-if="validPercentage < 50"
          color="yellow"
          variant="soft"
          title="Qualité des données faible"
          description="Plus de 50% des lignes contiennent des erreurs. Veuillez vérifier et corriger les erreurs avant l'import."
          class="mt-4"
          role="alert"
        />
      </div>

      <!-- Errors Table -->
      <div v-if="validationResult.errors.length > 0" class="mb-6">
        <div class="flex justify-between items-center mb-3">
          <h4 class="text-sm font-semibold">
            Détails des erreurs ({{ Math.min(validationResult.errors.length, 100) }} sur
            {{ validationResult.totalErrorCount }})
          </h4>
          <UButton size="xs" color="gray" variant="ghost" @click="downloadErrors">
            <UIcon name="i-heroicons-arrow-down-tray" class="mr-1" />
            Télécharger le CSV des erreurs
          </UButton>
        </div>

        <div class="overflow-x-auto border border-gray-200 rounded-lg">
          <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-4 py-2 text-left font-medium text-gray-700">Ligne #</th>
                <th scope="col" class="px-4 py-2 text-left font-medium text-gray-700">Champ</th>
                <th scope="col" class="px-4 py-2 text-left font-medium text-gray-700">Erreur</th>
                <th scope="col" class="px-4 py-2 text-left font-medium text-gray-700">Valeur originale</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              <tr
                v-for="error in paginatedErrors"
                :key="`${error.rowNumber}-${error.field}`"
                :class="{
                  'bg-orange-50': error.errorType === 'DUPLICATE_EMAIL',
                  'border-l-4 border-l-orange-400': error.errorType === 'DUPLICATE_EMAIL',
                }"
              >
                <td class="px-4 py-2 text-gray-900">{{ error.rowNumber }}</td>
                <td class="px-4 py-2">
                  <UBadge
                    :color="error.errorType === 'DUPLICATE_EMAIL' ? 'orange' : 'blue'"
                    variant="subtle"
                    size="xs"
                  >
                    {{ error.field }}
                  </UBadge>
                </td>
                <td
                  class="px-4 py-2"
                  :class="error.errorType === 'DUPLICATE_EMAIL' ? 'text-orange-600' : 'text-red-600'"
                >
                  {{ error.message }}
                </td>
                <td class="px-4 py-2 text-gray-600 truncate max-w-xs">
                  <span class="font-mono text-xs">{{ error.originalValue || '-' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="validationResult.errors.length > errorsPerPage" class="mt-4 flex justify-center">
          <UPagination
            v-model="currentPage"
            :total="validationResult.errors.length"
            :per-page="errorsPerPage"
          />
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between">
          <UButton color="gray" variant="ghost" :disabled="importing" @click="$emit('back')"> Retour </UButton>
          <div class="flex gap-2">
            <UButton v-if="validationResult.invalidCount > 0" color="gray" :disabled="importing" @click="$emit('cancel')">
              Annuler l'import
            </UButton>
            <UButton
              color="primary"
              :disabled="validationResult.validCount === 0 || importing"
              :loading="importing"
              :aria-busy="importing ? 'true' : 'false'"
              @click="confirmImport"
            >
              Importer {{ validationResult.validCount }} lignes valides
            </UButton>
          </div>
        </div>
      </template>
    </UCard>

    <!-- Confirmation Modal -->
    <UModal v-model="showConfirmModal" title="Confirmer l'import">
      <div class="p-4">
        <p class="mb-4">
          {{ validationResult.invalidCount }} lignes seront ignorées en raison d'erreurs de validation. Voulez-vous
          continuer l'import de {{ validationResult.validCount }} lignes valides ?
        </p>
        <div class="flex justify-end gap-2">
          <UButton color="gray" variant="ghost" @click="showConfirmModal = false"> Annuler </UButton>
          <UButton color="primary" @click="proceedImport"> Continuer </UButton>
        </div>
      </div>
    </UModal>
  </div>
</template>

<script setup lang="ts">
  import type { ValidationResult } from '~/types/validation.types';

  interface Props {
    validationResult: ValidationResult;
    importing?: boolean;
  }

  const props = defineProps<Props>();
  const emit = defineEmits(['back', 'cancel', 'import']);

  const currentPage = ref(1);
  const errorsPerPage = 25;
  const showConfirmModal = ref(false);

  const hasDuplicates = computed(() => {
    return props.validationResult.duplicateCount > 0;
  });

  const validPercentage = computed(() => {
    const total = props.validationResult.validCount + props.validationResult.invalidCount;
    if (total === 0) return 0;
    return Math.round((props.validationResult.validCount / total) * 100);
  });

  const paginatedErrors = computed(() => {
    const start = (currentPage.value - 1) * errorsPerPage;
    const end = start + errorsPerPage;
    return props.validationResult.errors.slice(start, end);
  });

  const confirmImport = () => {
    if (validPercentage.value < 50) {
      showConfirmModal.value = true;
    } else {
      proceedImport();
    }
  };

  const proceedImport = () => {
    showConfirmModal.value = false;
    emit('import');
  };

  const downloadErrors = () => {
    // Convert errors to CSV format with proper escaping
    const headers = ['Row #', 'Field', 'Error Type', 'Error Message', 'Original Value'];
    const rows = props.validationResult.errors.map((error) => [
      error.rowNumber,
      error.field,
      error.errorType,
      error.message,
      error.originalValue || '',
    ]);

    // Proper CSV escaping: wrap in quotes and escape internal quotes
    const escapeCsvCell = (cell: string | number): string => {
      const str = String(cell);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csv = [
      headers.map(escapeCsvCell).join(','),
      ...rows.map((row) => row.map(escapeCsvCell).join(',')),
    ].join('\n');

    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'validation_errors.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
</script>

<style scoped>
  .validation-results-step {
    max-width: 1200px;
    margin: 0 auto;
  }
</style>
