<template>
  <div class="subscribers-table-container">
    <div v-if="loading" class="loading">
      <p>Chargement des subscribers...</p>
    </div>

    <div v-else-if="error" class="error">
      <p>❌ Erreur de chargement</p>
    </div>

    <table v-else class="subscribers-table">
      <thead>
        <tr>
          <th @click="handleSort('email')" class="sortable">
            Email
            <span class="sort-icon">{{ getSortIcon('email') }}</span>
          </th>
          <th @click="handleSort('status')" class="sortable">
            Statut
            <span class="sort-icon">{{ getSortIcon('status') }}</span>
          </th>
          <th @click="handleSort('source')" class="sortable">
            Source
            <span class="sort-icon">{{ getSortIcon('source') }}</span>
          </th>
          <th @click="handleSort('created_at')" class="sortable">
            Date inscription
            <span class="sort-icon">{{ getSortIcon('created_at') }}</span>
          </th>
          <th @click="handleSort('confirmed_at')" class="sortable">
            Date confirmation
            <span class="sort-icon">{{ getSortIcon('confirmed_at') }}</span>
          </th>
          <th>Téléchargements</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="subscriber in subscribers" :key="subscriber.id">
          <td class="email-cell">{{ subscriber.email }}</td>
          <td>
            <span :class="['status-badge', `status-${subscriber.status}`]">
              {{ getStatusLabel(subscriber.status) }}
            </span>
          </td>
          <td>{{ subscriber.source || '-' }}</td>
          <td>{{ formatDate(subscriber.created_at) }}</td>
          <td>{{ subscriber.confirmed_at ? formatDate(subscriber.confirmed_at) : '-' }}</td>
          <td class="text-center">{{ subscriber.download_count }}</td>
          <td class="actions-cell">
            <button 
              @click="$emit('view', subscriber.id)"
              class="btn btn-view"
              title="Voir les détails"
            >
              👁️
            </button>
            <button 
              @click="$emit('delete', subscriber.id)"
              class="btn btn-delete"
              title="Supprimer (RGPD)"
            >
              🗑️
            </button>
          </td>
        </tr>

        <tr v-if="subscribers.length === 0">
          <td colspan="7" class="no-data">
            Aucun subscriber trouvé
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { SubscriberListItem } from '~/composables/useSubscribers';

interface Props {
  subscribers: SubscriberListItem[];
  loading: boolean;
  error: unknown;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface Emits {
  (e: 'sort', column: string): void;
  (e: 'view', id: string): void;
  (e: 'delete', id: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

function handleSort(column: string) {
  emit('sort', column);
}

function getSortIcon(column: string): string {
  if (props.sortBy !== column) return '⇅';
  return props.sortOrder === 'asc' ? '↑' : '↓';
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    unsubscribed: 'Désabonné',
    bounced: 'Rebond',
  };
  return labels[status] || status;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<style scoped>
.subscribers-table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.loading,
.error {
  padding: 3rem;
  text-align: center;
}

.error {
  color: #c62828;
}

.subscribers-table {
  width: 100%;
  border-collapse: collapse;
}

.subscribers-table thead {
  background: #F4F2EF;
}

.subscribers-table th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #213E60;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.subscribers-table th.sortable {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.subscribers-table th.sortable:hover {
  background: #E8E6E3;
}

.sort-icon {
  margin-left: 0.5rem;
  font-size: 0.75rem;
  color: #666;
}

.subscribers-table tbody tr {
  border-bottom: 1px solid #E0E0E0;
  transition: background-color 0.2s;
}

.subscribers-table tbody tr:hover {
  background: #F9F9F9;
}

.subscribers-table td {
  padding: 1rem;
  font-size: 0.95rem;
  color: #333;
}

.email-cell {
  font-weight: 500;
  color: #213E60;
}

.text-center {
  text-align: center;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-pending {
  background: #FFF9C4;
  color: #F57F17;
}

.status-confirmed {
  background: #C8E6C9;
  color: #2E7D32;
}

.status-unsubscribed {
  background: #FFCDD2;
  color: #C62828;
}

.status-bounced {
  background: #F5F5F5;
  color: #757575;
}

.actions-cell {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
}

.btn {
  border: none;
  background: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.btn:hover {
  background: #F4F2EF;
}

.btn-delete:hover {
  background: #FFCDD2;
}

.no-data {
  text-align: center;
  padding: 3rem !important;
  color: #666;
  font-style: italic;
}

/* Responsive */
@media (max-width: 1024px) {
  .subscribers-table {
    font-size: 0.85rem;
  }

  .subscribers-table th,
  .subscribers-table td {
    padding: 0.75rem 0.5rem;
  }
}

@media (max-width: 768px) {
  .subscribers-table {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
  }

  .subscribers-table th,
  .subscribers-table td {
    padding: 0.5rem;
  }
}
</style>
