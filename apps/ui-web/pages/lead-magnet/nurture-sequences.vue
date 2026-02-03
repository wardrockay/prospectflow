<template>
  <div class="nurture-sequences-page">
    <div class="header">
      <h1>Séquences de Nurturing</h1>
      <div class="actions">
        <NuxtLink to="/lead-magnet" class="btn-secondary">
          ← Retour au dashboard
        </NuxtLink>
        <NuxtLink to="/lead-magnet/nurture-sequences/new" class="btn-primary">
          + Nouvelle séquence
        </NuxtLink>
      </div>
    </div>

    <div v-if="loading" class="loading">Chargement...</div>
    
    <div v-else-if="error" class="error">
      Erreur lors du chargement des séquences
    </div>

    <div v-else-if="sequences?.data && sequences.data.length > 0" class="sequences-grid">
      <div
        v-for="sequence in sequences.data"
        :key="sequence.id"
        class="sequence-card"
      >
        <div class="card-header">
          <h3>{{ sequence.name }}</h3>
          <span :class="['status-badge', `status-${sequence.status}`]">
            {{ sequence.status === 'draft' ? 'Brouillon' : sequence.status === 'active' ? 'Actif' : 'Archivé' }}
          </span>
        </div>
        
        <p v-if="sequence.description" class="description">
          {{ sequence.description }}
        </p>
        
        <div class="card-footer">
          <span class="date">
            Créé le {{ new Date(sequence.created_at).toLocaleDateString('fr-FR') }}
          </span>
          <div class="actions">
            <NuxtLink :to="`/lead-magnet/nurture-sequences/${sequence.id}`" class="btn-view">
              Voir
            </NuxtLink>
            <button @click="handleDelete(sequence.id)" class="btn-delete">
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>Aucune séquence de nurturing créée.</p>
      <NuxtLink to="/lead-magnet/nurture-sequences/new" class="btn-primary">
        Créer votre première séquence
      </NuxtLink>
    </div>

    <!-- Delete confirmation dialog -->
    <div v-if="showDeleteDialog" class="modal-overlay" @click="showDeleteDialog = false">
      <div class="modal" @click.stop>
        <h3>Confirmer la suppression</h3>
        <p>Êtes-vous sûr de vouloir supprimer cette séquence ?</p>
        <div class="modal-actions">
          <button @click="showDeleteDialog = false" class="btn-secondary">
            Annuler
          </button>
          <button @click="confirmDelete" class="btn-danger">
            Supprimer
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
});

const { sequences, loading, error, refresh, deleteSequence } = useNurtureSequences();

const showDeleteDialog = ref(false);
const sequenceToDelete = ref<string | null>(null);

const handleDelete = (id: string) => {
  sequenceToDelete.value = id;
  showDeleteDialog.value = true;
};

const confirmDelete = async () => {
  if (sequenceToDelete.value) {
    try {
      await deleteSequence(sequenceToDelete.value);
      showDeleteDialog.value = false;
      sequenceToDelete.value = null;
    } catch (err) {
      console.error('Failed to delete sequence:', err);
    }
  }
};
</script>

<style scoped>
.nurture-sequences-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 2rem;
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 1rem;
}

.btn-primary, .btn-secondary, .btn-danger {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  text-decoration: none;
  font-weight: 500;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-secondary {
  background: #e5e7eb;
  color: #374151;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.loading, .error {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.error {
  color: #ef4444;
}

.sequences-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.sequence-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s;
}

.sequence-card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 0.75rem;
}

.card-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-draft {
  background: #e5e7eb;
  color: #6b7280;
}

.status-active {
  background: #d1fae5;
  color: #065f46;
}

.status-archived {
  background: #fef3c7;
  color: #92400e;
}

.description {
  color: #6b7280;
  margin-bottom: 1rem;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.date {
  font-size: 0.875rem;
  color: #9ca3af;
}

.card-footer .actions {
  display: flex;
  gap: 0.5rem;
}

.btn-view {
  padding: 0.25rem 0.75rem;
  background: #f3f4f6;
  color: #374151;
  border-radius: 0.375rem;
  text-decoration: none;
  font-size: 0.875rem;
}

.btn-delete {
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.125rem;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-state p {
  color: #6b7280;
  margin-bottom: 1rem;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal {
  background: white;
  border-radius: 0.75rem;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
}

.modal h3 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
}

.modal p {
  color: #6b7280;
  margin-bottom: 1.5rem;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .sequences-grid {
    grid-template-columns: 1fr;
  }
}
</style>
