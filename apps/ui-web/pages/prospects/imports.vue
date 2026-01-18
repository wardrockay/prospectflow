<template>
  <div class="container mx-auto p-6">
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold mb-2">Imports en attente</h1>
      <p class="text-gray-600">Liste des fichiers CSV en attente de mapping ou de traitement</p>
    </div>

    <!-- Campaign Selector -->
    <div class="mb-6">
      <UFormGroup label="Campagne">
        <USelectMenu
          v-model="selectedCampaignId"
          :options="campaignOptions"
          :loading="loadingCampaigns"
          placeholder="Sélectionner une campagne"
          value-attribute="value"
          option-attribute="label"
        />
      </UFormGroup>
    </div>

    <!-- Loading State -->
    <div v-if="loading || loadingCampaigns" class="flex justify-center py-12">
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

    <!-- Empty State -->
    <div v-if="!loading && !error && imports.length === 0" class="text-center py-12">
      <UIcon name="i-heroicons-inbox" class="text-6xl text-gray-400 mb-4" />
      <p class="text-gray-600 text-lg mb-2">Aucun import en attente</p>
      <p class="text-gray-500 text-sm mb-6">
        Tous vos imports ont été traités ou aucune campagne n'a été sélectionnée
      </p>
      <UButton
        v-if="selectedCampaignId"
        color="primary"
        icon="i-heroicons-plus"
        @click="navigateTo(`/prospects/import?campaignId=${selectedCampaignId}`)"
      >
        Importer des Prospects
      </UButton>
    </div>

    <!-- Imports List -->
    <div v-if="!loading && !error && imports.length > 0" class="space-y-4">
      <UCard
        v-for="upload in imports"
        :key="upload.id"
        class="hover:shadow-md transition-shadow"
      >
        <div class="flex items-center justify-between">
          <!-- File Info -->
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <UIcon name="i-heroicons-document-text" class="text-2xl text-gray-600" />
              <div>
                <h3 class="text-lg font-semibold text-gray-900">{{ upload.filename }}</h3>
                <p class="text-sm text-gray-500">
                  {{ formatFileSize(upload.fileSize) }} • {{ upload.rowCount }} lignes •
                  Uploadé le {{ formatDate(upload.uploadedAt) }}
                </p>
              </div>
            </div>
            
            <!-- Status Badge -->
            <UBadge
              :color="getStatusColor(upload.status)"
              variant="subtle"
              size="sm"
            >
              {{ getStatusLabel(upload.status) }}
            </UBadge>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <!-- Continue Mapping Button -->
            <UButton
              v-if="upload.status === 'uploaded'"
              color="primary"
              icon="i-heroicons-arrow-right"
              @click="continueMapping(upload.id)"
            >
              Continuer le mapping
            </UButton>

            <!-- Launch Import Button -->
            <UButton
              v-else-if="upload.status === 'mapped'"
              color="primary"
              icon="i-heroicons-arrow-up-tray"
              @click="launchImport(upload.id, upload.campaignId)"
            >
              Lancer l'import
            </UButton>

            <!-- View Details Button -->
            <UButton
              v-else-if="upload.status === 'validating' || upload.status === 'validation_failed'"
              color="primary"
              variant="outline"
              icon="i-heroicons-eye"
              @click="viewDetails(upload.id, upload.campaignId)"
            >
              Voir les détails
            </UButton>

            <!-- Completed Status -->
            <UBadge
              v-else-if="upload.status === 'completed'"
              color="green"
              variant="solid"
              size="lg"
            >
              <UIcon name="i-heroicons-check-circle" class="mr-1" />
              Terminé
            </UBadge>

            <!-- Delete Button (always available) -->
            <UButton
              color="red"
              variant="ghost"
              icon="i-heroicons-trash"
              size="sm"
              @click="handleDeleteImport(upload.id, upload.filename)"
            />
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

useHead({
  title: 'Imports en attente | ProspectFlow',
});

const router = useRouter();
const toast = useToast();

// Fetch real campaigns from API
const { campaigns, pending: loadingCampaigns } = useCampaigns();

// Campaign selection
const selectedCampaignId = ref<string>('');

// Format campaigns for select menu
const campaignOptions = computed(() => {
  return campaigns.value.map((campaign) => ({
    value: campaign.id,
    label: campaign.name,
  }));
});

// Pass selectedCampaignId as ref so it stays reactive
const { 
  loading, 
  error, 
  imports, 
  fetchImports,
  deleteImport,
  formatFileSize,
  formatDate,
  getStatusColor,
  getStatusLabel,
} = useImportsList(selectedCampaignId);

// Watch for campaign selection changes and fetch only when campaign is selected
watch(selectedCampaignId, async (newCampaignId) => {
  if (newCampaignId) {
    try {
      await fetchImports();
    } catch (err) {
      console.error('Failed to fetch imports:', err);
    }
  } else {
    // Clear imports when no campaign selected
    imports.value = [];
  }
});

/**
 * Continue to mapping page for an upload
 */
const continueMapping = (uploadId: string) => {
  router.push(`/prospects/import/map?upload_id=${uploadId}&campaign_id=${selectedCampaignId.value}`);
};

/**
 * Launch import - redirect to validation page
 */
const launchImport = (uploadId: string, campaignId: string) => {
  router.push(`/prospects/import/validate?upload_id=${uploadId}&campaign_id=${campaignId}`);
};

/**
 * View details for a mapped/validated import
 */
const viewDetails = (uploadId: string, campaignId: string) => {
  router.push(`/prospects/import/validate?upload_id=${uploadId}&campaign_id=${campaignId}`);
};

/**
 * Handle delete import with confirmation
 */
const handleDeleteImport = async (uploadId: string, filename: string) => {
  const confirmed = confirm(`Êtes-vous sûr de vouloir supprimer l'import "${filename}" ?\n\nCette action est irréversible.`);
  
  if (!confirmed) {
    return;
  }

  try {
    await deleteImport(uploadId);
    
    toast.add({
      title: 'Import supprimé',
      description: `L'import "${filename}" a été supprimé avec succès`,
      color: 'green',
      icon: 'i-heroicons-check-circle',
    });
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: 'Impossible de supprimer l\'import',
      color: 'red',
      icon: 'i-heroicons-x-circle',
    });
  }
};

// Don't auto-load on mount - wait for user to select a campaign
// User must explicitly choose a campaign from dropdown
</script>
