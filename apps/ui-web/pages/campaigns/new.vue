<script setup lang="ts">
  definePageMeta({
    middleware: 'auth',
    layout: 'default',
  });

  useHead({
    title: 'Créer une campagne | ProspectFlow',
  });

  /**
   * Handle successful campaign creation
   * Redirects to campaign details page
   */
  const handleSuccess = (campaignId: string) => {
    navigateTo(`/campaigns/${campaignId}`);
  };

  /**
   * Handle cancel action
   * Returns to campaign list
   */
  const handleCancel = () => {
    navigateTo('/campaigns');
  };
</script>

<template>
  <UContainer>
    <div class="py-8 max-w-2xl mx-auto">
      <!-- Page header -->
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-gray-900">Créer une campagne</h1>
        <p class="mt-2 text-sm text-gray-600">
          Remplissez les informations ci-dessous pour créer une nouvelle campagne de prospection.
        </p>
      </div>

      <!-- Campaign form -->
      <UCard>
        <CampaignForm mode="create" @success="handleSuccess" @cancel="handleCancel" />
      </UCard>
    </div>
  </UContainer>
</template>
