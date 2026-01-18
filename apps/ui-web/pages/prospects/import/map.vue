<template>
  <div class="max-w-4xl mx-auto py-8 px-4">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Mapping des colonnes</h1>
      <p class="text-gray-600 mt-1">
        Associez les colonnes de votre fichier CSV aux champs de votre CRM
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !mappings.length" class="flex justify-center py-12">
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

    <!-- Mapping Component -->
    <ProspectColumnMapper
      v-if="mappings.length > 0"
      :mappings="mappings"
      :validation="validation"
      @update-mapping="handleUpdateMapping"
      @back="handleBack"
      @confirm="handleConfirm"
    />
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

if (!uploadId.value) {
  throw createError({
    statusCode: 400,
    message: 'Upload ID manquant',
  });
}

const {
  loading,
  error,
  mappings,
  validation,
  campaignId,
  fetchColumnMappings,
  updateMapping,
  submitMappings,
} = useColumnMapping(uploadId.value);

// Fetch column mappings on mount - this will also populate campaignId
onMounted(async () => {
  try {
    await fetchColumnMappings();
  } catch {
    // Error is already set in composable and displayed via UAlert
  }
});

const handleUpdateMapping = (detectedColumn: string, suggestedField: string) => {
  updateMapping(detectedColumn, suggestedField);
};

const handleBack = () => {
  router.push('/prospects/import');
};

const handleConfirm = async () => {
  try {
    await submitMappings();
    
    toast.add({
      title: 'Mappings sauvegardés',
      description: 'Les colonnes ont été mappées avec succès',
      color: 'green',
    });

    // Navigate to validation page with both uploadId and campaignId
    router.push(`/prospects/import/validate?upload_id=${uploadId.value}&campaign_id=${campaignId.value}`);
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err.message || 'Impossible de sauvegarder les mappings',
      color: 'red',
    });
  }
};
</script>
