
<script setup lang="ts">
  definePageMeta({
    middleware: 'auth',
  });

  useHead({
    title: 'Import de Prospects | ProspectFlow',
  });

  const route = useRoute();
  const router = useRouter();
  const toast = useToast();

  // Get campaignId from query params (required)
  const campaignId = computed(() => route.query.campaignId as string);

  // Modal state - open by default when page loads
  const isModalOpen = ref(true);

  // Validate campaignId exists - client-side only to avoid SSR issues (M1 fix)
  onMounted(() => {
    if (!campaignId.value) {
      toast.add({
        title: 'Erreur',
        description: 'ID de campagne manquant. Veuillez sélectionner une campagne.',
        color: 'red',
        icon: 'i-heroicons-exclamation-triangle',
      });
      navigateTo('/campaigns');
    }
  });

  /**
   * Handle successful upload
   * Navigate to mapping page with uploadId and campaignId
   */
  const handleUploaded = (uploadId: string) => {
    console.log('Upload success, navigating to map page with uploadId:', uploadId);
    navigateTo(`/prospects/import/map?upload_id=${uploadId}&campaign_id=${campaignId.value}`);
  };

  /**
   * Handle modal close
   * Return to campaigns page
   */
  const handleClose = () => {
    router.push('/campaigns');
  };
</script>

<template>
  <div class="container mx-auto p-6">
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold mb-2">Import de Prospects</h1>
      <p class="text-gray-600">Importez vos prospects depuis un fichier CSV ou Excel</p>
    </div>

    <!-- Import Modal Component -->
    <ImportModal
      v-if="campaignId"
      v-model="isModalOpen"
      :campaign-id="campaignId"
      @uploaded="handleUploaded"
      @close="handleClose"
    />
  </div>
</template>
