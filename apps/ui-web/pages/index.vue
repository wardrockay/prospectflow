<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
});
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold">Dashboard</h1>
      <p class="text-gray-600 mt-2">Bienvenue sur ProspectFlow</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-folder" class="w-6 h-6 text-primary" />
            <h3 class="text-lg font-semibold">Campagnes</h3>
          </div>
        </template>
        <p class="text-gray-600">Gérez vos campagnes de prospection</p>
        <template #footer>
          <UButton to="/campaigns" variant="soft" block> Voir les campagnes </UButton>
        </template>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-users" class="w-6 h-6 text-primary" />
            <h3 class="text-lg font-semibold">Prospects</h3>
          </div>
        </template>
        <p class="text-gray-600">Importez et gérez vos prospects</p>
        <template #footer>
          <UButton to="/prospects" variant="soft" block> Voir les prospects </UButton>
        </template>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-chart-bar" class="w-6 h-6 text-primary" />
            <h3 class="text-lg font-semibold">Statistiques</h3>
          </div>
        </template>
        <p class="text-gray-600">Analysez vos performances</p>
        <template #footer>
          <UButton to="/analytics" variant="soft" block disabled> Bientôt disponible </UButton>
        </template>
      </UCard>
    </div>
  </div>
</template>
