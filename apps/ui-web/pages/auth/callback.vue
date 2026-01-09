<script setup lang="ts">
definePageMeta({
  layout: 'empty',
});

const route = useRoute();
const config = useRuntimeConfig();
const { accessToken } = useAuth();

onMounted(async () => {
  const code = route.query.code as string;

  if (!code) {
    console.error('No authorization code received');
    navigateTo('/login');
    return;
  }

  try {
    // Exchange authorization code for tokens via backend
    const response = await $fetch<{ access_token: string }>(
      `${config.public.apiBase}/auth/callback`,
      {
        method: 'GET',
        query: { code },
      },
    );

    // Store access token in cookie
    accessToken.value = response.access_token;

    // Redirect to dashboard
    await navigateTo('/');
  } catch (error) {
    console.error('Authentication error:', error);
    navigateTo('/login');
  }
});
</script>

<template>
  <UContainer class="flex items-center justify-center min-h-screen">
    <UCard>
      <div class="text-center space-y-4 py-8">
        <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 animate-spin mx-auto text-primary" />
        <div>
          <h2 class="text-xl font-semibold">Connexion en cours...</h2>
          <p class="text-sm text-gray-500 mt-2">Veuillez patienter</p>
        </div>
      </div>
    </UCard>
  </UContainer>
</template>
