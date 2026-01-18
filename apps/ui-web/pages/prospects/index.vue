<script setup lang="ts">
  definePageMeta({
    middleware: 'auth',
  });

  useHead({
    title: 'Prospects | ProspectFlow',
  });
</script>

<template>
  <div class="container mx-auto p-6">
    <h1 class="text-3xl font-bold mb-4">Prospects</h1>
    <p class="text-gray-600 mb-8">Gérez vos prospects et imports</p>

    <!-- Quick Actions Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <!-- Imports en cours Card -->
      <UCard class="hover:shadow-lg transition-shadow">
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-queue-list" class="text-2xl text-primary" />
            <h2 class="text-xl font-semibold">Imports en cours</h2>
          </div>
        </template>
        
        <p class="text-gray-600 mb-4">
          Consultez et gérez vos imports CSV en attente de mapping ou de validation
        </p>
        
        <template #footer>
          <UButton
            to="/prospects/imports"
            color="primary"
            block
            icon="i-heroicons-arrow-right"
            trailing
          >
            Voir les imports
          </UButton>
        </template>
      </UCard>

      <!-- Liste des prospects Card -->
      <UCard class="hover:shadow-lg transition-shadow opacity-60">
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-users" class="text-2xl text-gray-400" />
            <h2 class="text-xl font-semibold text-gray-500">Liste des prospects</h2>
          </div>
        </template>
        
        <p class="text-gray-600 mb-4">
          Visualisez et gérez tous vos prospects (À venir)
        </p>
        
        <template #footer>
          <UButton
            color="gray"
            variant="soft"
            block
            disabled
          >
            Bientôt disponible
          </UButton>
        </template>
      </UCard>
    </div>

    <!-- Back to Dashboard -->
    <UButton to="/" variant="link" icon="i-heroicons-arrow-left">
      Retour au Dashboard
    </UButton>
  </div>
</template>
