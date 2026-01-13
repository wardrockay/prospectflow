<script setup lang="ts">
  definePageMeta({
    middleware: 'auth',
  });

  useHead({
    title: 'Prospects | ProspectFlow',
  });
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold mb-4">Prospects</h1>
    <p class="text-gray-600 mb-6">Page des prospects - À venir dans l'Epic UI-2</p>
    <UButton to="/" variant="link" icon="i-heroicons-arrow-left"> Retour au Dashboard </UButton>
  </div>
</template>
