<template>
  <div class="max-w-6xl mx-auto py-8 px-4">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Résultats de validation</h1>
      <p class="text-gray-600 mt-1">
        Vérifiez les résultats avant d'importer vos prospects
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !validationResult" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin h-8 w-8 text-primary" />
    </div>

    <!-- Error State -->
    <UAlert
      v-if="error"
      color="red"
      variant="soft"
      title="Erreur"
      :description="error"
      class="mb-4"
    />

    <!-- Validation Results Component -->
    <ProspectsValidationResultsStep
      v-if="validationResult"
      :validation-result="validationResult"
      :importing="importing"
      @back="handleBack"
      @import="handleImport"
    />

    <!-- Screen Reader Announcements for Accessibility -->
    <div v-if="validationResult && !loading" role="status" aria-live="polite" class="sr-only">
      Validation terminée: {{ validationResult.validCount }} lignes valides, 
      {{ validationResult.invalidCount }} lignes invalides
    </div>
    <div v-if="importing" role="status" aria-live="polite" class="sr-only">
      Import en cours, veuillez patienter...
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

const route = useRoute();
const router = useRouter();
const toast = useToast();

const uploadId = computed(() => route.query.upload_id as string);
const campaignId = computed(() => route.query.campaign_id as string);

// Validate required query params
if (!uploadId.value?.trim() || !campaignId.value?.trim()) {
  throw createError({
    statusCode: 400,
    message: 'Upload ID et Campaign ID requis',
  });
}

const {
  loading,
  error,
  validationResult,
  importing,
  fetchValidationResults,
  executeImport,
} = useValidationResults(uploadId.value, campaignId.value);

// Fetch validation results on mount
onMounted(async () => {
  try {
    console.log('Fetching validation results for uploadId:', uploadId.value);
    await fetchValidationResults();
    console.log('Validation results fetched:', validationResult.value);
  } catch (err) {
    // Error is already set in composable and displayed via UAlert
    console.error('Failed to fetch validation results:', err);
  }
});

const handleBack = () => {
  router.push(`/prospects/import/map?upload_id=${uploadId.value}`);
};

const handleImport = async () => {
  try {
    const summary = await executeImport();
    
    toast.add({
      title: 'Import réussi',
      description: `${summary.imported} prospects importés avec succès`,
      color: 'green',
      icon: 'i-heroicons-check-circle',
    });

    // Navigate to campaign details with prospects tab
    router.push(`/campaigns/${campaignId.value}?tab=prospects`);
  } catch (err: any) {
    // Use error from composable which has better error message extraction
    const errorMessage = error.value || err.message || 'Impossible d\'importer les prospects';
    toast.add({
      title: 'Erreur d\'import',
      description: errorMessage,
      color: 'red',
      icon: 'i-heroicons-x-circle',
    });
  }
};
</script>
