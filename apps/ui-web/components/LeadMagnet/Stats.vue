<template>
  <div class="lead-magnet-stats">
    <h2 class="stats-title">📊 Métriques Lead Magnet</h2>
    
    <div v-if="loading" class="loading">
      <p>Chargement des statistiques...</p>
    </div>

    <div v-else-if="error" class="error">
      <p>❌ Erreur de chargement des stats</p>
    </div>

    <div v-else-if="stats" class="stats-grid">
      <!-- Total Signups -->
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.total_signups }}</div>
          <div class="stat-label">Inscriptions totales</div>
        </div>
      </div>

      <!-- Confirmed -->
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.confirmed }}</div>
          <div class="stat-label">Confirmés</div>
        </div>
      </div>

      <!-- Confirmation Rate -->
      <div class="stat-card highlight">
        <div class="stat-icon">📈</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.confirmation_rate }}%</div>
          <div class="stat-label">Taux de confirmation</div>
        </div>
      </div>

      <!-- Unique Downloaders -->
      <div class="stat-card">
        <div class="stat-icon">📥</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.unique_downloaders }}</div>
          <div class="stat-label">Téléchargeurs uniques</div>
        </div>
      </div>

      <!-- Total Downloads -->
      <div class="stat-card">
        <div class="stat-icon">🔄</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.total_downloads }}</div>
          <div class="stat-label">Téléchargements totaux</div>
        </div>
      </div>

      <!-- Avg Time to Confirm -->
      <div class="stat-card">
        <div class="stat-icon">⏱️</div>
        <div class="stat-content">
          <div class="stat-value">{{ formatAvgHours(stats.avg_hours_to_confirm) }}</div>
          <div class="stat-label">Temps moyen de confirmation</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LeadMagnetStats } from '~/composables/useLeadMagnetStats';

interface Props {
  stats: LeadMagnetStats | null;
  loading?: boolean;
  error?: unknown;
}

defineProps<Props>();

/**
 * Format avg_hours_to_confirm safely (handles null/NaN/undefined)
 */
function formatAvgHours(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return `${value.toFixed(1)}h`;
}
</script>

<style scoped>
.lead-magnet-stats {
  margin-bottom: 2rem;
}

.stats-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #213E60;
  margin-bottom: 1.5rem;
}

.loading,
.error {
  padding: 2rem;
  text-align: center;
  border-radius: 8px;
  background: #F4F2EF;
}

.error {
  background: #ffebee;
  color: #c62828;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.stat-card.highlight {
  background: linear-gradient(135deg, #FFCC2B 0%, #FFD95E 100%);
}

.stat-card.highlight .stat-label,
.stat-card.highlight .stat-value {
  color: #213E60;
}

.stat-icon {
  font-size: 2.5rem;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #213E60;
  line-height: 1;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #666;
  font-weight: 500;
}

/* Responsive */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }

  .stat-card {
    padding: 1rem;
  }

  .stat-icon {
    font-size: 2rem;
  }

  .stat-value {
    font-size: 1.5rem;
  }

  .stat-label {
    font-size: 0.75rem;
  }
}
</style>
