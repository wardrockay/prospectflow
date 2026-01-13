<script setup lang="ts">
  definePageMeta({
    middleware: 'auth',
  });
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold mb-4">Campagnes</h1>
    <p class="text-gray-600 mb-6">Page des campagnes - À venir dans l'Epic UI-1</p>
    <UButton to="/" variant="link" icon="i-heroicons-arrow-left"> Retour au Dashboard </UButton>
  </div>
</template>
