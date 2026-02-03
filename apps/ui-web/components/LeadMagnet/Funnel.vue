<template>
  <div class="lead-magnet-funnel">
    <h3 class="funnel-title">🎯 Entonnoir de Conversion</h3>
    
    <div v-if="!stats" class="loading">
      <p>Chargement...</p>
    </div>

    <div v-else class="funnel-stages">
      <!-- Stage 1: Signups -->
      <div class="stage">
        <div class="stage-header">
          <span class="stage-name">1. Inscriptions</span>
          <span class="stage-count">{{ stats.total_signups }}</span>
        </div>
        <div class="stage-bar-container">
          <div class="stage-bar" :style="{ width: '100%' }">
            <span class="stage-percentage">100%</span>
          </div>
        </div>
      </div>

      <!-- Stage 2: Confirmed -->
      <div class="stage">
        <div class="stage-header">
          <span class="stage-name">2. Confirmés</span>
          <span class="stage-count">{{ stats.confirmed }}</span>
        </div>
        <div class="stage-bar-container">
          <div 
            class="stage-bar" 
            :style="{ width: confirmationPercentage + '%' }"
            :class="getBarColor(confirmationPercentage)"
          >
            <span class="stage-percentage">{{ confirmationPercentage }}%</span>
          </div>
        </div>
      </div>

      <!-- Stage 3: Downloaded -->
      <div class="stage">
        <div class="stage-header">
          <span class="stage-name">3. Téléchargés</span>
          <span class="stage-count">{{ stats.unique_downloaders }}</span>
        </div>
        <div class="stage-bar-container">
          <div 
            class="stage-bar" 
            :style="{ width: downloadPercentage + '%' }"
            :class="getBarColor(downloadPercentage)"
          >
            <span class="stage-percentage">{{ downloadPercentage }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Conversion Summary -->
    <div v-if="stats" class="conversion-summary">
      <div class="summary-item">
        <span class="summary-label">Taux de conversion global:</span>
        <span class="summary-value">{{ overallConversion }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LeadMagnetStats } from '~/composables/useLeadMagnetStats';

interface Props {
  stats: LeadMagnetStats | null;
}

const props = defineProps<Props>();

const confirmationPercentage = computed(() => {
  if (!props.stats || props.stats.total_signups === 0) return 0;
  return Math.round((props.stats.confirmed / props.stats.total_signups) * 100);
});

const downloadPercentage = computed(() => {
  if (!props.stats || props.stats.confirmed === 0) return 0;
  return Math.round((props.stats.unique_downloaders / props.stats.confirmed) * 100);
});

const overallConversion = computed(() => {
  if (!props.stats || props.stats.total_signups === 0) return 0;
  return Math.round((props.stats.unique_downloaders / props.stats.total_signups) * 100);
});

function getBarColor(percentage: number): string {
  if (percentage >= 70) return 'bar-high';
  if (percentage >= 40) return 'bar-medium';
  return 'bar-low';
}
</script>

<style scoped>
.lead-magnet-funnel {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 2rem;
}

.funnel-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #213E60;
  margin-bottom: 1.5rem;
}

.loading {
  padding: 2rem;
  text-align: center;
  color: #666;
}

.funnel-stages {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.stage {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.95rem;
  font-weight: 600;
}

.stage-name {
  color: #213E60;
}

.stage-count {
  color: #666;
  font-weight: 500;
}

.stage-bar-container {
  background: #F4F2EF;
  border-radius: 8px;
  height: 48px;
  overflow: hidden;
  position: relative;
}

.stage-bar {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 1rem;
  border-radius: 8px;
  transition: width 0.5s ease;
  background: linear-gradient(90deg, #94B6EF, #6A9FE8);
  min-width: 80px; /* Ensure percentage is always visible */
}

.stage-bar.bar-high {
  background: linear-gradient(90deg, #4CAF50, #66BB6A);
}

.stage-bar.bar-medium {
  background: linear-gradient(90deg, #FFCC2B, #FFD95E);
}

.stage-bar.bar-low {
  background: linear-gradient(90deg, #FF6B6B, #FF8787);
}

.stage-percentage {
  color: white;
  font-weight: 700;
  font-size: 1.1rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.conversion-summary {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 2px solid #F4F2EF;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-label {
  font-size: 1rem;
  font-weight: 600;
  color: #213E60;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #FFCC2B;
}

/* Responsive */
@media (max-width: 768px) {
  .lead-magnet-funnel {
    padding: 1.5rem;
  }

  .stage-bar-container {
    height: 40px;
  }

  .stage-percentage {
    font-size: 0.95rem;
  }
}
</style>
