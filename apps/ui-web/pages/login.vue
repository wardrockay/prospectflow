<script setup lang="ts">
  definePageMeta({
    layout: 'empty',
  });

  const route = useRoute();
  const { login } = useAuth();
  
  // Check for session expiration
  const showExpiredMessage = ref(route.query.expired === 'true');
  const isLoggingIn = ref(false);
  
  // Auto-hide message after 5 seconds
  if (showExpiredMessage.value) {
    setTimeout(() => {
      showExpiredMessage.value = false;
    }, 5000);
  }

  const handleLogin = () => {
    isLoggingIn.value = true;
    login();
  };
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
        <!-- Session expired alert -->
        <UAlert
          v-if="showExpiredMessage"
          color="orange"
          variant="soft"
          title="Session expirée"
          description="Votre session a expiré. Veuillez vous reconnecter."
          icon="i-heroicons-exclamation-triangle"
          :close-button="{ icon: 'i-heroicons-x-mark-20-solid', color: 'gray', variant: 'link' }"
          @close="showExpiredMessage = false"
        />

        <div class="text-center">
          <p class="text-gray-600">Connectez-vous pour accéder à votre espace de prospection</p>
        </div>

        <UButton 
          block 
          size="xl" 
          @click="handleLogin" 
          icon="i-heroicons-arrow-right-on-rectangle"
          :loading="isLoggingIn"
          :disabled="isLoggingIn"
        >
          {{ isLoggingIn ? 'Redirection...' : 'Se connecter' }}
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
