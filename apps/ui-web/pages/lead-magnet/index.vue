<template>
  <div class="lead-magnet-dashboard">
    <div class="dashboard-header">
      <h1>📊 Dashboard Lead Magnet</h1>
      <p class="subtitle">Analytics et métriques de performance</p>
    </div>

    <!-- Period Filter -->
    <div class="controls">
      <div class="period-filter">
        <label for="period">Période :</label>
        <select id="period" v-model="selectedPeriod" class="period-select">
          <option value="7d">7 derniers jours</option>
          <option value="30d">30 derniers jours</option>
          <option value="90d">90 derniers jours</option>
          <option value="all">Depuis le début</option>
        </select>
      </div>

      <div class="auto-refresh">
        <label class="checkbox-label">
          <input 
            v-model="autoRefresh" 
            type="checkbox"
            class="checkbox"
          />
          <span>Auto-refresh (60s)</span>
        </label>
      </div>
    </div>

    <!-- KPIs -->
    <LeadMagnetStats 
      :stats="stats" 
      :loading="loading"
      :error="error"
    />

    <!-- Funnel Visualization -->
    <LeadMagnetFunnel :stats="stats" />

    <!-- Quick Links -->
    <div class="quick-links">
      <h3>Gestion</h3>
      <div class="links-grid">
        <NuxtLink to="/lead-magnet/subscribers" class="link-card">
          <span class="link-icon">👥</span>
          <span class="link-title">Subscribers</span>
          <span class="link-description">Gérer la liste des inscrits</span>
        </NuxtLink>
        
        <NuxtLink to="/lead-magnet/nurture-sequences" class="link-card">
          <span class="link-icon">📧</span>
          <span class="link-title">Séquences de Nurturing</span>
          <span class="link-description">Planifier les séquences d'emails</span>
        </NuxtLink>
        
        <NuxtLink to="/lead-magnet/email-templates" class="link-card">
          <span class="link-icon">📝</span>
          <span class="link-title">Templates d'Email</span>
          <span class="link-description">Gérer les modèles d'emails</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLeadMagnetStats } from '~/composables/useLeadMagnetStats';

definePageMeta({
  layout: 'default',
  middleware: 'auth',
});

// Reactive period selection
const selectedPeriod = ref<string>('all');
const autoRefresh = ref<boolean>(false);

// Fetch stats with reactive period
const { stats, loading, error, refresh } = useLeadMagnetStats({
  period: selectedPeriod,
});

// Auto-refresh setup
let refreshInterval: NodeJS.Timeout | null = null;

watch(autoRefresh, (enabled) => {
  if (enabled) {
    // Refresh every 60 seconds
    refreshInterval = setInterval(() => {
      refresh();
    }, 60000);
  } else {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }
});

// Clean up interval on unmount
onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});

// Refresh when period changes
watch(selectedPeriod, () => {
  refresh();
});
</script>

<style scoped>
.lead-magnet-dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.dashboard-header {
  margin-bottom: 2rem;
}

.dashboard-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #213E60;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #666;
  font-size: 1rem;
}

.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.period-filter {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.period-filter label {
  font-weight: 600;
  color: #213E60;
}

.period-select {
  padding: 0.5rem 1rem;
  border: 2px solid #E0E0E0;
  border-radius: 6px;
  font-size: 0.95rem;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;
}

.period-select:hover {
  border-color: #94B6EF;
}

.period-select:focus {
  outline: none;
  border-color: #FFCC2B;
}

.auto-refresh {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  color: #213E60;
}

.checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.quick-links {
  margin-top: 3rem;
}

.quick-links h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #213E60;
  margin-bottom: 1rem;
}

.links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.link-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
}

.link-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.link-icon {
  font-size: 2rem;
}

.link-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #213E60;
}

.link-description {
  font-size: 0.875rem;
  color: #666;
}

/* Responsive */
@media (max-width: 768px) {
  .lead-magnet-dashboard {
    padding: 1rem;
  }

  .controls {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .period-filter {
    flex-direction: column;
    align-items: stretch;
  }

  .period-select {
    width: 100%;
  }

  .dashboard-header h1 {
    font-size: 1.5rem;
  }
}
</style>
