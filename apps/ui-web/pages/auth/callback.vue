<script setup lang="ts">
  definePageMeta({
    layout: 'empty',
  });

  const route = useRoute();
  const config = useRuntimeConfig();

  // Manage authentication state and error display
  const isLoading = ref(true);
  const errorMessage = ref('');

  onMounted(async () => {
    const code = route.query.code as string;

    console.log('Callback received, code:', code ? `${code.substring(0, 10)}...` : 'NONE');

    if (!code) {
      console.error('No authorization code received');
      errorMessage.value = 'Erreur de connexion. Veuillez réessayer.';
      setTimeout(() => navigateTo('/login'), 3000);
      return;
    }

    try {
      console.log('Calling /api/auth/callback...');
      // Exchange authorization code for tokens via Nuxt server API
      // Server will set httpOnly cookies automatically
      const response = await $fetch('/api/auth/callback', {
        method: 'POST',
        body: { code },
      });
      console.log('Callback response:', response);

      // Cookies are set server-side with httpOnly flag
      // Redirect to dashboard
      await navigateTo('/');
    } catch (error: any) {
      console.error('Authentication error:', error);
      console.error('Error details:', {
        status: error?.statusCode || error?.status,
        message: error?.message,
        data: error?.data,
      });
      errorMessage.value = 'Erreur de connexion. Veuillez réessayer.';
      isLoading.value = false;

      // Redirect to login after 3 seconds
      setTimeout(() => {
        errorMessage.value = '';
        navigateTo('/login');
      }, 3000);
    }
  });
</script>

<template>
  <UContainer class="flex items-center justify-center min-h-screen">
    <UCard>
      <div v-if="isLoading" class="text-center space-y-4 py-8">
        <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 animate-spin mx-auto text-primary" />
        <div>
          <h2 class="text-xl font-semibold">Connexion en cours...</h2>
          <p class="text-sm text-gray-500 mt-2">Veuillez patienter</p>
        </div>
      </div>

      <div v-else class="text-center space-y-4 py-8">
        <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 mx-auto text-red-500" />
        <div>
          <h2 class="text-xl font-semibold text-red-600">{{ errorMessage }}</h2>
          <p class="text-sm text-gray-500 mt-2">Redirection vers la page de connexion...</p>
        </div>
      </div>
    </UCard>
  </UContainer>
</template>
