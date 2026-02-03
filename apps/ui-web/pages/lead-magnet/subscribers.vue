<template>
  <div class="subscribers-page">
    <div class="page-header">
      <div>
        <h1>👥 Subscribers Lead Magnet</h1>
        <p class="subtitle">Liste complète des inscrits au lead magnet</p>
      </div>
      <NuxtLink to="/lead-magnet" class="btn-back">
        ← Retour au Dashboard
      </NuxtLink>
    </div>

    <!-- Controls -->
    <div class="controls">
      <div class="search-box">
        <label for="search">🔍</label>
        <input 
          id="search"
          v-model="searchInput"
          type="text"
          placeholder="Rechercher par email..."
          class="search-input"
          @input="onSearchDebounced"
        />
      </div>

      <button @click="handleExport" class="btn-export" :disabled="loading">
        📥 Exporter CSV
      </button>
    </div>

    <!-- Table -->
    <LeadMagnetSubscribersTable 
      :subscribers="subscribers"
      :loading="loading"
      :error="error"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      @sort="handleSort"
      @view="handleView"
      @delete="handleDelete"
    />

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button 
        :disabled="page === 1" 
        @click="page--"
        class="pagination-btn"
      >
        ← Précédent
      </button>
      
      <span class="pagination-info">
        Page {{ page }} / {{ totalPages }} ({{ total }} subscribers)
      </span>
      
      <button 
        :disabled="page >= totalPages" 
        @click="page++"
        class="pagination-btn"
      >
        Suivant →
      </button>
    </div>

    <!-- View Detail Modal (placeholder) -->
    <div v-if="selectedSubscriberId" class="modal-overlay" @click.self="selectedSubscriberId = null">
      <div class="modal">
        <div class="modal-header">
          <h2>Détails Subscriber</h2>
          <button @click="selectedSubscriberId = null" class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <p>ID: {{ selectedSubscriberId }}</p>
          <p><em>Détails complets à implémenter dans une prochaine itération</em></p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSubscribers } from '~/composables/useSubscribers';
import { useDebounceFn } from '@vueuse/core';

definePageMeta({
  layout: 'default',
  middleware: 'auth',
});

const page = ref(1);
const searchInput = ref('');
const search = ref('');
const sortBy = ref('created_at');
const sortOrder = ref<'asc' | 'desc'>('desc');
const selectedSubscriberId = ref<string | null>(null);

const {
  subscribers,
  total,
  totalPages,
  loading,
  error,
  refresh,
  deleteSubscriber,
  exportToCsv,
} = useSubscribers({
  page,
  limit: 25,
  search,
  sortBy,
  sortOrder,
});

// Debounced search - update search ref after 300ms
const onSearchDebounced = useDebounceFn(() => {
  search.value = searchInput.value;
  page.value = 1; // Reset to first page on search
}, 300);

function handleSort(column: string) {
  if (sortBy.value === column) {
    // Toggle order
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    // New column, default to desc
    sortBy.value = column;
    sortOrder.value = 'desc';
  }
}

function handleView(id: string) {
  selectedSubscriberId.value = id;
  // TODO: Fetch subscriber details and display in modal
}

async function handleDelete(id: string) {
  const confirmed = confirm(
    'Supprimer ce subscriber ?\n\n' +
    'Cette action est irréversible et supprimera toutes les données associées (RGPD).\n\n' +
    'Continuer ?'
  );

  if (!confirmed) return;

  const success = await deleteSubscriber(id);

  if (success) {
    alert('✅ Subscriber supprimé avec succès');
  } else {
    alert('❌ Erreur lors de la suppression');
  }
}

async function handleExport() {
  try {
    await exportToCsv();
    // Download is triggered automatically via browser
  } catch (err) {
    alert('❌ Erreur lors de l\'export CSV');
    console.error(err);
  }
}
</script>

<style scoped>
.subscribers-page {
  max-width: 1600px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #213E60;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #666;
  font-size: 1rem;
}

.btn-back {
  padding: 0.75rem 1.5rem;
  background: #F4F2EF;
  color: #213E60;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  transition: background-color 0.2s;
}

.btn-back:hover {
  background: #E8E6E3;
}

.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  max-width: 400px;
  background: white;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 2px solid #E0E0E0;
  transition: border-color 0.2s;
}

.search-box:focus-within {
  border-color: #FFCC2B;
}

.search-box label {
  font-size: 1.25rem;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 1rem;
}

.btn-export {
  padding: 0.75rem 1.5rem;
  background: #FFCC2B;
  color: #213E60;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-export:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 204, 43, 0.3);
}

.btn-export:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  margin-top: 2rem;
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.pagination-btn {
  padding: 0.75rem 1.5rem;
  background: #213E60;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: #2D5173;
}

.pagination-btn:disabled {
  background: #E0E0E0;
  color: #999;
  cursor: not-allowed;
}

.pagination-info {
  font-weight: 600;
  color: #213E60;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 2px solid #F4F2EF;
}

.modal-header h2 {
  font-size: 1.5rem;
  color: #213E60;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.modal-close:hover {
  background: #F4F2EF;
}

.modal-body {
  padding: 1.5rem;
}

/* Responsive */
@media (max-width: 768px) {
  .subscribers-page {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .controls {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    max-width: none;
  }

  .pagination {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
