<template>
  <div class="subscriber-detail-page">
    <div class="page-header">
      <NuxtLink to="/lead-magnet/subscribers" class="btn-back">
        ← Retour à la liste
      </NuxtLink>
      <h1>👤 Détails Subscriber</h1>
    </div>

    <div v-if="loading" class="loading">
      <p>Chargement des informations...</p>
    </div>

    <div v-else-if="error" class="error">
      <p>❌ Erreur lors du chargement du subscriber</p>
      <NuxtLink to="/lead-magnet/subscribers" class="btn-secondary">
        Retour à la liste
      </NuxtLink>
    </div>

    <div v-else-if="subscriber" class="detail-content">
      <!-- Main Info Card -->
      <div class="info-card main-info">
        <h2>Informations principales</h2>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Email</span>
            <span class="value email">{{ subscriber.email }}</span>
          </div>
          <div class="info-item">
            <span class="label">Statut</span>
            <span :class="['status-badge', `status-${subscriber.status}`]">
              {{ getStatusLabel(subscriber.status) }}
            </span>
          </div>
          <div class="info-item">
            <span class="label">Source</span>
            <span class="value">{{ subscriber.source || 'Non spécifiée' }}</span>
          </div>
          <div class="info-item">
            <span class="label">Date d'inscription</span>
            <span class="value">{{ formatDate(subscriber.created_at) }}</span>
          </div>
          <div class="info-item">
            <span class="label">Date de confirmation</span>
            <span class="value">
              {{ subscriber.confirmed_at ? formatDate(subscriber.confirmed_at) : 'Non confirmé' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Download Tokens Card -->
      <div class="info-card">
        <h2>📥 Tokens de téléchargement</h2>
        <div v-if="subscriber.download_tokens && subscriber.download_tokens.length > 0" class="tokens-list">
          <table class="tokens-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Créé le</th>
                <th>Expire le</th>
                <th>Utilisé le</th>
                <th>Utilisations</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="token in subscriber.download_tokens" :key="token.id">
                <td>{{ token.purpose }}</td>
                <td>{{ formatDate(token.created_at) }}</td>
                <td>{{ formatDate(token.expires_at) }}</td>
                <td>{{ token.used_at ? formatDate(token.used_at) : '—' }}</td>
                <td class="text-center">{{ token.use_count }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="empty-state">Aucun token de téléchargement</p>
      </div>

      <!-- Consent Events Card (RGPD Audit Trail) -->
      <div class="info-card">
        <h2>📋 Historique des consentements (RGPD)</h2>
        <div v-if="subscriber.consent_events && subscriber.consent_events.length > 0" class="events-list">
          <div v-for="event in subscriber.consent_events" :key="event.id" class="event-item">
            <div class="event-type">
              <span :class="['event-badge', `event-${event.event_type}`]">
                {{ getEventLabel(event.event_type) }}
              </span>
            </div>
            <div class="event-details">
              <span class="event-date">{{ formatDate(event.created_at) }}</span>
              <span v-if="event.ip_address" class="event-ip">IP: {{ event.ip_address }}</span>
            </div>
          </div>
        </div>
        <p v-else class="empty-state">Aucun événement de consentement</p>
      </div>

      <!-- Actions -->
      <div class="actions-card">
        <button @click="handleDelete" class="btn-danger">
          🗑️ Supprimer (RGPD)
        </button>
        <p class="warning-text">
          ⚠️ La suppression est irréversible et efface toutes les données associées.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const router = useRouter();

definePageMeta({
  layout: 'default',
  middleware: 'auth',
});

const subscriberId = computed(() => route.params.id as string);

// Fetch subscriber detail
const config = useRuntimeConfig();
const ingestApiUrl = config.public.ingestApiUrl || 'http://localhost:4000';

const { data: response, pending: loading, error } = useFetch(
  () => `/api/admin/lead-magnet/subscribers/${subscriberId.value}`,
  {
    credentials: 'include',
  }
);

const subscriber = computed(() => response.value?.data || null);

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    unsubscribed: 'Désabonné',
    bounced: 'Rebond',
  };
  return labels[status] || status;
}

function getEventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    signup: 'Inscription',
    confirm: 'Confirmation',
    unsubscribe: 'Désabonnement',
    download: 'Téléchargement',
  };
  return labels[eventType] || eventType;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function handleDelete() {
  const confirmed = confirm(
    'Supprimer ce subscriber ?\n\n' +
    'Cette action est irréversible et supprimera toutes les données associées (RGPD).\n\n' +
    'Continuer ?'
  );

  if (!confirmed) return;

  try {
    await $fetch(`/api/admin/lead-magnet/subscribers/${subscriberId.value}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    alert('✅ Subscriber supprimé avec succès');
    router.push('/lead-magnet/subscribers');
  } catch (err) {
    alert('❌ Erreur lors de la suppression');
    console.error(err);
  }
}
</script>

<style scoped>
.subscriber-detail-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #213E60;
  margin: 0;
}

.btn-back {
  padding: 0.5rem 1rem;
  background: #F4F2EF;
  color: #213E60;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-back:hover {
  background: #E8E6E3;
}

.loading, .error {
  text-align: center;
  padding: 3rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.error {
  color: #c62828;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.info-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.info-card h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #213E60;
  margin: 0 0 1.5rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #E0E0E0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item .label {
  font-size: 0.875rem;
  color: #666;
  font-weight: 500;
}

.info-item .value {
  font-size: 1rem;
  color: #213E60;
}

.info-item .value.email {
  font-weight: 600;
  word-break: break-all;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-pending { background: #FFF3E0; color: #E65100; }
.status-confirmed { background: #E8F5E9; color: #2E7D32; }
.status-unsubscribed { background: #FFEBEE; color: #C62828; }
.status-bounced { background: #FCE4EC; color: #AD1457; }

.tokens-table {
  width: 100%;
  border-collapse: collapse;
}

.tokens-table th,
.tokens-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #E0E0E0;
}

.tokens-table th {
  font-weight: 600;
  color: #213E60;
  font-size: 0.875rem;
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.event-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #F4F2EF;
  border-radius: 8px;
}

.event-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
}

.event-signup { background: #E3F2FD; color: #1565C0; }
.event-confirm { background: #E8F5E9; color: #2E7D32; }
.event-unsubscribe { background: #FFEBEE; color: #C62828; }
.event-download { background: #FFF3E0; color: #E65100; }

.event-details {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: #666;
}

.empty-state {
  color: #999;
  font-style: italic;
  padding: 1rem 0;
}

.actions-card {
  background: #FFF8E1;
  border: 1px solid #FFE082;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.btn-danger {
  padding: 0.75rem 1.5rem;
  background: #EF5350;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-danger:hover {
  background: #E53935;
}

.warning-text {
  font-size: 0.875rem;
  color: #666;
  margin: 0;
}

.text-center {
  text-align: center;
}

@media (max-width: 768px) {
  .subscriber-detail-page {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
