<script setup lang="ts">
  definePageMeta({
    middleware: 'auth',
  });

  useHead({
    title: 'Mapping de Colonnes | ProspectFlow',
  });

  const route = useRoute();
  const router = useRouter();

  // Get uploadId from query params
  const uploadId = computed(() => route.query.upload_id as string);

  // Validate uploadId exists
  if (!uploadId.value) {
    navigateTo('/prospects/import');
  }
</script>

<template>
  <div class="container mx-auto p-6">
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold mb-2">Mapping de Colonnes</h1>
      <p class="text-gray-600">
        Associez les colonnes de votre fichier aux champs ProspectFlow
      </p>
    </div>

    <!-- Upload ID Display -->
    <UCard class="mb-6">
      <div class="space-y-4">
        <div>
          <p class="text-sm text-gray-500 mb-1">Upload ID</p>
          <p class="font-mono text-sm">{{ uploadId }}</p>
        </div>

        <UAlert
          color="blue"
          variant="soft"
          icon="i-heroicons-information-circle"
          title="Fonctionnalité en développement"
          description="L'interface de mapping des colonnes sera implémentée dans la Story UI-2.2"
        />
      </div>
    </UCard>

    <!-- Navigation Buttons -->
    <div class="flex gap-3">
      <UButton
        to="/prospects/import"
        color="gray"
        variant="soft"
        icon="i-heroicons-arrow-left"
      >
        Retour à l'import
      </UButton>
      <UButton to="/campaigns" color="primary" icon="i-heroicons-home">
        Retour aux campagnes
      </UButton>
    </div>
  </div>
</template>
