<template>
  <div class="unsubscribe-page">
    <div class="container">
      <!-- Loading State -->
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>Traitement en cours...</p>
      </div>

      <!-- Success State -->
      <div v-else-if="success" class="success">
        <div class="icon">✅</div>
        <h1>Désinscription confirmée</h1>
        <p>Vous avez été désinscrit(e) avec succès de tous nos emails.</p>
        <p class="email" v-if="email">{{ email }}</p>
        <p class="note">Nous sommes désolés de vous voir partir. Si vous changez d'avis, vous pouvez toujours vous réinscrire sur notre site.</p>
        <a href="https://lightandshutter.fr" class="btn-primary">Retour au site</a>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error">
        <div class="icon">❌</div>
        <h1>Erreur</h1>
        <p>{{ errorMessage }}</p>
        <a href="https://lightandshutter.fr/contact" class="btn-secondary">Nous contacter</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();

const loading = ref(true);
const success = ref(false);
const error = ref(false);
const errorMessage = ref('');
const email = ref('');

// Process unsubscribe on mount
onMounted(async () => {
  const token = route.query.token as string;

  if (!token) {
    error.value = true;
    errorMessage.value = 'Token de désinscription manquant';
    loading.value = false;
    return;
  }

  try {
    // Call Nuxt server proxy which forwards to ingest-api
    const response = await $fetch<{ success: boolean; email?: string; error?: string }>(
      `/api/lead-magnet/unsubscribe?token=${encodeURIComponent(token)}`,
    );

    if (response.success) {
      success.value = true;
      email.value = response.email || '';
    } else {
      error.value = true;
      errorMessage.value = response.error || 'Une erreur est survenue';
    }
  } catch (err: unknown) {
    error.value = true;
    if (err && typeof err === 'object' && 'data' in err) {
      const fetchError = err as { data?: { message?: string } };
      errorMessage.value = fetchError.data?.message || 'Erreur de connexion au serveur';
    } else {
      errorMessage.value = 'Erreur de connexion au serveur';
    }
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.unsubscribe-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f4f2ef 0%, #e8e6e3 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.container {
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  width: 100%;
  padding: 3rem;
  text-align: center;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e0e0e0;
  border-top-color: #213e60;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

h1 {
  font-family: 'Cormorant Garamond', serif;
  font-size: 2.5rem;
  color: #213e60;
  margin-bottom: 1rem;
}

p {
  font-size: 1.1rem;
  color: #666;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.email {
  font-weight: 600;
  color: #213e60;
  font-size: 1.2rem;
}

.note {
  font-size: 0.95rem;
  color: #999;
  font-style: italic;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e0e0e0;
}

.btn-primary,
.btn-secondary {
  display: inline-block;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  margin-top: 2rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #d4af37 0%, #c49d2f 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(212, 175, 55, 0.3);
}

.btn-secondary {
  background: #f4f2ef;
  color: #213e60;
}

.btn-secondary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.error h1 {
  color: #c62828;
}

@media (max-width: 640px) {
  .container {
    padding: 2rem 1.5rem;
  }

  h1 {
    font-size: 2rem;
  }

  p {
    font-size: 1rem;
  }
}
</style>
