<script setup lang="ts">
definePageMeta({
  layout: 'empty',
  middleware: 'auth',
});

const { login } = useAuth();
</script>

<template>
  <UContainer class="flex items-center justify-center min-h-screen">
    <UCard class="max-w-md w-full">
      <template #header>
        <div class="text-center">
          <h1 class="text-3xl font-bold text-primary">ProspectFlow</h1>
          <p class="text-sm text-gray-500 mt-2">Plateforme de prospection intelligente</p>
        </div>
      </template>

      <div class="space-y-6 py-4">
        <div class="text-center">
          <p class="text-gray-600">Connectez-vous pour accéder à votre espace de prospection</p>
        </div>

        <UButton block size="xl" @click="login" icon="i-heroicons-arrow-right-on-rectangle">
          Se connecter
        </UButton>
      </div>

      <template #footer>
        <div class="text-center text-sm text-gray-500">
          Authentification sécurisée via AWS Cognito
        </div>
      </template>
    </UCard>
  </UContainer>
</template>
