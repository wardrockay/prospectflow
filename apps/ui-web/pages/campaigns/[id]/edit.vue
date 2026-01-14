<script setup lang="ts">
  // Define page metadata
  definePageMeta({
    middleware: 'auth',
    layout: 'default',
  });

  // Get campaign ID from route
  const route = useRoute();
  const router = useRouter();
  const campaignId = route.params.id as string;

  // Page title
  useHead({
    title: 'Modifier la campagne - ProspectFlow',
  });

  // Fetch campaign data
  const { campaign, pending, error } = useCampaign(campaignId);

  // Prepare initial data for form
  const initialData = computed(() => {
    if (!campaign.value) return undefined;
    return {
      name: campaign.value.name,
      valueProp: campaign.value.valueProp || '',
    };
  });

  // Debug logging
  watch(
    [campaign, pending, error, initialData],
    () => {
      console.log('[EditPage] State:', {
        hasCampaign: !!campaign.value,
        campaign: campaign.value,
        pending: pending.value,
        error: error.value,
        hasInitialData: !!initialData.value,
        initialData: initialData.value,
      });
    },
    { immediate: true }
  );

  /**
   * Handle successful form submission
   * Navigate back to campaign details page
   * Note: Toast is handled by CampaignForm component
   */
  const handleSuccess = () => {
    router.push(`/campaigns/${campaignId}`);
  };

  /**
   * Handle cancel action
   * Navigate back to campaign details without saving
   */
  const handleCancel = () => {
    router.push(`/campaigns/${campaignId}`);
  };

  /**
   * Navigate back to campaigns list
   * Used for 404 error state
   */
  const goToCampaignsList = () => {
    router.push('/campaigns');
  };
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Page Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Modifier la campagne</h1>
      <p class="mt-2 text-sm text-gray-600">Mettez à jour les informations de votre campagne</p>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="space-y-6">
      <USkeleton class="h-8 w-64" />
      <div class="space-y-4">
        <USkeleton class="h-10 w-full" />
        <USkeleton class="h-24 w-full" />
        <div class="flex gap-3">
          <USkeleton class="h-10 w-32" />
          <USkeleton class="h-10 w-32" />
        </div>
      </div>
    </div>

    <!-- Error State: 404 -->
    <div v-else-if="error && error.statusCode === 404" class="text-center py-12">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
        <svg
          class="w-8 h-8 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 class="text-2xl font-semibold text-gray-900 mb-2">Campagne introuvable</h2>
      <p class="text-gray-600 mb-6">
        La campagne que vous recherchez n'existe pas ou a été supprimée.
      </p>
      <UButton color="primary" size="lg" @click="goToCampaignsList"> Retour aux campagnes </UButton>
    </div>

    <!-- Error State: Other Errors -->
    <div v-else-if="error" class="text-center py-12">
      <UAlert
        color="red"
        variant="soft"
        title="Erreur de chargement"
        :description="error.data?.message || 'Impossible de charger la campagne'"
        icon="i-heroicons-exclamation-triangle"
      />
      <UButton color="primary" size="lg" class="mt-6" @click="goToCampaignsList">
        Retour aux campagnes
      </UButton>
    </div>

    <!-- Campaign Form -->
    <div v-else-if="campaign && initialData">
      <CampaignForm
        mode="edit"
        :campaignId="campaignId"
        :initialData="initialData"
        @success="handleSuccess"
        @cancel="handleCancel"
      />
    </div>
  </div>
</template>
