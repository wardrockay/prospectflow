<script setup lang="ts">
  definePageMeta({
    middleware: 'auth',
    layout: 'default',
  });

  // Get campaign ID from route
  const route = useRoute();
  const router = useRouter();
  const campaignId = route.params.id as string;

  useHead({
    title: 'Détails de la campagne | ProspectFlow',
  });

  // Fetch campaign data using composable
  const { campaign, pending, error } = await useCampaign(campaignId);

  // Archive modal state
  const showArchiveModal = ref(false);
  const isArchiving = ref(false);

  // Import modal state
  const showImportModal = ref(false);

  // Handle successful upload
  const handleUploadSuccess = (uploadId: string) => {
    console.log('Upload successful:', uploadId);
    // TODO: Navigate to validation step in next story
    useToast().add({
      title: 'Import en cours',
      description: 'Les prospects seront validés dans la prochaine étape',
      color: 'blue',
    });
  };

  // Compute error message based on status
  const errorMessage = computed(() => {
    if (!error.value) return null;
    const statusCode = (error.value as any)?.statusCode || (error.value as any)?.status;
    if (statusCode === 404) {
      return 'Campagne introuvable';
    }
    if (statusCode === 401) {
      return 'Session expirée. Veuillez vous reconnecter.';
    }
    if (statusCode === 403) {
      return "Accès refusé. Vous n'avez pas les permissions nécessaires.";
    }
    return 'Une erreur serveur est survenue lors du chargement de la campagne.';
  });

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Show archive button only if not already archived
  const canArchive = computed(() => {
    return campaign.value && campaign.value.status !== 'archived';
  });

  // Archive campaign handler
  const archiveCampaign = async () => {
    isArchiving.value = true;
    try {
      await $fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        body: { status: 'archived' },
      });

      // Update local state immediately (optimistic update)
      if (campaign.value) {
        campaign.value.status = 'archived';
      }

      // Show success toast
      useToast().add({
        title: 'Campagne archivée',
        description: 'La campagne a été archivée avec succès',
        color: 'green',
      });

      showArchiveModal.value = false;
    } catch (archiveError) {
      console.error('Archive error:', archiveError);
      useToast().add({
        title: 'Erreur',
        description: "Impossible d'archiver la campagne",
        color: 'red',
      });
    } finally {
      isArchiving.value = false;
    }
  };

  // Navigation handlers
  const goToEdit = () => {
    router.push(`/campaigns/${campaignId}/edit`);
  };

  const goBack = () => {
    router.push('/campaigns');
  };
</script>

<template>
  <UContainer>
    <div class="p-6">
      <!-- Loading State -->
      <div v-if="pending" class="space-y-6">
        <!-- Header Skeleton -->
        <div class="flex justify-between items-center mb-6">
          <USkeleton class="h-8 w-64" />
          <div class="flex gap-2">
            <USkeleton class="h-10 w-24" />
            <USkeleton class="h-10 w-24" />
            <USkeleton class="h-10 w-24" />
          </div>
        </div>

        <!-- Details Skeleton -->
        <UCard>
          <div class="space-y-4">
            <USkeleton class="h-6 w-48" />
            <USkeleton class="h-20 w-full" />
            <div class="flex gap-4">
              <USkeleton class="h-6 w-24" />
              <USkeleton class="h-6 w-32" />
            </div>
          </div>
        </UCard>

        <!-- Stats Skeleton -->
        <UCard>
          <div class="space-y-4">
            <USkeleton class="h-6 w-32" />
            <div class="flex gap-4">
              <USkeleton class="h-16 w-32" />
              <USkeleton class="h-16 w-32" />
            </div>
          </div>
        </UCard>
      </div>

      <!-- Error State (404 or other errors) -->
      <div v-else-if="error" class="text-center py-12" role="alert" aria-live="polite">
        <UIcon name="i-heroicons-exclamation-triangle" class="text-6xl text-red-400 mb-4" />
        <p class="text-red-500 mb-4">{{ errorMessage }}</p>
        <UButton @click="goBack()" variant="outline" icon="i-heroicons-arrow-left">
          Retour à la liste
        </UButton>
      </div>

      <!-- Campaign Details -->
      <div v-else-if="campaign" class="space-y-6">
        <!-- Header with Actions -->
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold">Détails de la campagne</h1>
          <div class="flex gap-2">
            <UButton
              @click="goBack()"
              icon="i-heroicons-arrow-left"
              variant="outline"
              color="gray"
              aria-label="Retour à la liste"
            >
              Retour
            </UButton>
            <UButton
              @click="goToEdit()"
              icon="i-heroicons-pencil"
              color="primary"
              aria-label="Modifier la campagne"
            >
              Modifier
            </UButton>
            <UButton
              v-if="canArchive"
              @click="showArchiveModal = true"
              icon="i-heroicons-archive-box"
              color="orange"
              aria-label="Archiver la campagne"
            >
              Archiver
            </UButton>
          </div>
        </div>

        <!-- General Information -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Informations générales</h2>
          </template>

          <div class="space-y-4">
            <!-- Campaign Name -->
            <div>
              <div class="text-sm font-medium text-gray-600">Nom</div>
              <p class="text-lg">{{ campaign.name }}</p>
            </div>

            <!-- Value Proposition -->
            <div v-if="campaign.valueProp">
              <div class="text-sm font-medium text-gray-600">Proposition de valeur</div>
              <p class="text-gray-700">{{ campaign.valueProp }}</p>
            </div>

            <!-- Status Badge -->
            <div>
              <div class="text-sm font-medium text-gray-600">Statut</div>
              <div class="mt-1">
                <CampaignStatusBadge :status="campaign.status" />
              </div>
            </div>

            <!-- Created Date -->
            <div>
              <div class="text-sm font-medium text-gray-600">Date de création</div>
              <p class="text-gray-700">{{ formatDate(campaign.created_at) }}</p>
            </div>
          </div>
        </UCard>

        <!-- Statistics -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Statistiques</h2>
          </template>

          <div class="flex gap-6">
            <!-- Prospect Count -->
            <div>
              <div class="text-sm font-medium text-gray-600">Prospects</div>
              <p class="text-2xl font-bold text-primary">{{ campaign.prospect_count }}</p>
            </div>

            <!-- Emails Sent (if available) -->
            <div v-if="campaign.emails_sent !== undefined">
              <div class="text-sm font-medium text-gray-600">Emails envoyés</div>
              <p class="text-2xl font-bold text-primary">{{ campaign.emails_sent }}</p>
            </div>
          </div>
        </UCard>

        <!-- Prospects Preview (Placeholder for Task 4) -->
        <UCard>
          <template #header>
            <div class="flex justify-between items-center">
              <h2 class="text-lg font-semibold">Prospects ({{ campaign.prospect_count }})</h2>
              <div class="flex gap-2">
                <UButton
                  color="primary"
                  icon="i-heroicons-arrow-up-tray"
                  @click="showImportModal = true"
                >
                  Importer des Prospects
                </UButton>
                <UButton
                  v-if="campaign.prospect_count > 0"
                  variant="ghost"
                  color="primary"
                  size="sm"
                  icon="i-heroicons-arrow-right"
                  trailing
                  @click="router.push(`/campaigns/${campaignId}/prospects`)"
                >
                  Voir tous les prospects
                </UButton>
              </div>
            </div>
          </template>

          <div v-if="campaign.prospect_count === 0" class="text-center py-8 text-gray-500">
            <UIcon name="i-heroicons-users" class="text-4xl mb-2" />
            <p>Aucun prospect dans cette campagne</p>
            <p class="text-sm mt-2">Cliquez sur "Importer des Prospects" pour commencer</p>
          </div>
          <div v-else class="text-center py-8 text-gray-500">
            <p>Aperçu des 5 premiers prospects - À implémenter</p>
          </div>
        </UCard>
      </div>

      <!-- Import Prospects Modal -->
      <ProspectImportModal
        v-model="showImportModal"
        :campaign-id="campaignId"
        @close="showImportModal = false"
        @uploaded="handleUploadSuccess"
      />

      <!-- Archive Confirmation Modal -->
      <UModal
        v-model="showArchiveModal"
        :ui="{ width: 'sm:max-w-md' }"
        :aria="{ labelledby: 'archive-modal-title' }"
      >
        <UCard>
          <template #header>
            <h3 id="archive-modal-title" class="text-lg font-semibold">Archiver la campagne</h3>
          </template>

          <div class="space-y-4">
            <p class="text-gray-700">Êtes-vous sûr de vouloir archiver cette campagne ?</p>
            <p class="text-sm text-gray-500">
              Cette action mettra la campagne en statut "archivé".
            </p>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                @click="showArchiveModal = false"
                variant="outline"
                color="gray"
                :disabled="isArchiving"
              >
                Annuler
              </UButton>
              <UButton @click="archiveCampaign()" color="orange" :loading="isArchiving">
                Confirmer
              </UButton>
            </div>
          </template>
        </UCard>
      </UModal>
    </div>
  </UContainer>
</template>
