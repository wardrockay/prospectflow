<script setup lang="ts">
  import type { Campaign } from '~/composables/useCampaigns';

  definePageMeta({
    middleware: 'auth',
    layout: 'default',
  });

  useHead({
    title: 'Campagnes | ProspectFlow',
  });

  // State
  const currentPage = ref(1);
  const selectedStatus = ref<string | undefined>(undefined);
  const searchQuery = ref('');

  // Sync page with URL query params
  const route = useRoute();
  const router = useRouter();

  // Initialize page from URL query param
  onMounted(() => {
    const pageParam = route.query.page;
    if (pageParam) {
      currentPage.value = parseInt(pageParam as string, 10) || 1;
    }
  });

  // Watch page changes and update URL
  watch(currentPage, (newPage) => {
    router.push({
      query: { ...route.query, page: newPage.toString() },
    });
  });

  // Fetch campaigns with composable (filtering done client-side)
  const { campaigns, pagination, pending, error, refresh } = useCampaigns({
    page: currentPage,
    limit: 10,
  });

  // Status filter options
  const statusOptions = [
    { label: 'Tous les statuts', value: undefined },
    { label: 'Brouillon', value: 'draft' },
    { label: 'Actif', value: 'active' },
    { label: 'En pause', value: 'paused' },
    { label: 'Terminé', value: 'completed' },
  ];

  // Client-side filtering (search + status)
  const filteredCampaigns = computed(() => {
    if (!campaigns.value) return [];

    let result = campaigns.value;

    // Apply status filter (client-side for better UX)
    if (selectedStatus.value) {
      result = result.filter((campaign: Campaign) => campaign.status === selectedStatus.value);
    }

    // Apply search filter
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter((campaign: Campaign) => campaign.name.toLowerCase().includes(query));
    }

    return result;
  });

  // Compute error message based on HTTP status
  const errorMessage = computed(() => {
    if (!error.value) return null;
    const statusCode = (error.value as any)?.statusCode || (error.value as any)?.status;
    if (statusCode === 401) {
      // Redirect handled by middleware, but show message just in case
      return 'Session expirée. Veuillez vous reconnecter.';
    }
    if (statusCode === 403) {
      return "Accès refusé. Vous n'avez pas les permissions nécessaires.";
    }
    return 'Une erreur serveur est survenue lors du chargement des campagnes.';
  });

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Navigate to campaign details
  const goToCampaign = (campaignId: string) => {
    router.push(`/campaigns/${campaignId}`);
  };

  // Table columns configuration
  const columns = [
    { key: 'name', label: 'Nom' },
    { key: 'status', label: 'Statut' },
    { key: 'prospect_count', label: 'Prospects' },
    { key: 'created_at', label: 'Date de création' },
  ];
</script>

<template>
  <UContainer>
    <div class="p-6">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">Campagnes</h1>
        <UButton to="/campaigns/new" icon="i-heroicons-plus" color="primary">
          Créer une campagne
        </UButton>
      </div>

      <!-- Filters -->
      <div class="flex gap-4 mb-6">
        <UInput
          v-model="searchQuery"
          placeholder="Rechercher une campagne..."
          icon="i-heroicons-magnifying-glass"
          class="flex-1"
        />
        <USelect
          v-model="selectedStatus"
          :options="statusOptions"
          placeholder="Filtrer par statut"
          value-attribute="value"
          option-attribute="label"
          class="w-64"
        />
      </div>

      <!-- Loading State -->
      <div v-if="pending" class="flex justify-center items-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl text-gray-400" />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-12" role="alert" aria-live="polite">
        <UIcon name="i-heroicons-exclamation-triangle" class="text-6xl text-red-400 mb-4" />
        <p class="text-red-500 mb-4">{{ errorMessage }}</p>
        <UButton @click="refresh()" variant="outline" aria-label="Réessayer le chargement">
          Réessayer
        </UButton>
      </div>

      <!-- Empty State -->
      <div v-else-if="!filteredCampaigns.length && !pending" class="text-center py-12">
        <UCard>
          <div class="py-8">
            <UIcon name="i-heroicons-inbox" class="text-6xl text-gray-300 mb-4" />
            <h3 class="text-xl font-semibold mb-2">Aucune campagne</h3>
            <p class="text-gray-500 mb-6">Commencez par créer votre première campagne</p>
            <UButton to="/campaigns/new" icon="i-heroicons-plus" color="primary">
              Créer une campagne
            </UButton>
          </div>
        </UCard>
      </div>

      <!-- Campaign List Table -->
      <div v-else>
        <UTable
          :columns="columns"
          :rows="filteredCampaigns"
          :loading="pending"
          @select="(row: Campaign) => goToCampaign(row.id)"
          class="cursor-pointer"
          aria-label="Liste des campagnes"
        >
          <template #name-data="{ row }">
            <div>
              <div class="font-medium">{{ row.name }}</div>
              <div v-if="row.description" class="text-sm text-gray-500 truncate max-w-md">
                {{ row.description }}
              </div>
            </div>
          </template>

          <template #status-data="{ row }">
            <CampaignStatusBadge :status="row.status" />
          </template>

          <template #prospect_count-data="{ row }">
            <span class="text-gray-700">{{ row.prospect_count }}</span>
          </template>

          <template #created_at-data="{ row }">
            <span class="text-sm text-gray-500">{{ formatDate(row.created_at) }}</span>
          </template>
        </UTable>

        <!-- Pagination -->
        <div
          v-if="pagination && pagination.totalPages > 1"
          class="flex justify-center mt-6"
          role="navigation"
          aria-label="Pagination des campagnes"
        >
          <UPagination v-model="currentPage" :total="pagination.total" :page-count="10" />
        </div>
      </div>
    </div>
  </UContainer>
</template>
