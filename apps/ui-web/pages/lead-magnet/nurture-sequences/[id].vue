<template>
  <div class="sequence-edit-page">
    <div class="page-header">
      <NuxtLink to="/lead-magnet/nurture-sequences" class="btn-back">
        ← Retour aux séquences
      </NuxtLink>
      <h1>{{ isNew ? '➕ Nouvelle Séquence' : '✏️ Modifier Séquence' }}</h1>
    </div>

    <div v-if="loading && !isNew" class="loading">
      <p>Chargement de la séquence...</p>
    </div>

    <div v-else-if="error && !isNew" class="error">
      <p>❌ Erreur lors du chargement</p>
      <NuxtLink to="/lead-magnet/nurture-sequences" class="btn-secondary">
        Retour à la liste
      </NuxtLink>
    </div>

    <div v-else class="sequence-form-container">
      <!-- Sequence Info Form -->
      <form @submit.prevent="handleSubmit" class="form-section">
        <h2>Informations de la séquence</h2>
        
        <div class="form-group">
          <label for="name">Nom de la séquence *</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            required
            placeholder="Ex: Follow-up Post-Téléchargement"
            class="input"
          />
        </div>

        <div class="form-group">
          <label for="description">Description</label>
          <textarea
            id="description"
            v-model="form.description"
            rows="3"
            placeholder="Objectif et stratégie de cette séquence"
            class="input"
          />
        </div>

        <div class="form-group">
          <label for="status">Statut</label>
          <select id="status" v-model="form.status" class="input">
            <option value="draft">Brouillon</option>
            <option value="active">Actif</option>
            <option value="archived">Archivé</option>
          </select>
        </div>

        <div class="form-actions">
          <NuxtLink to="/lead-magnet/nurture-sequences" class="btn-secondary">
            Annuler
          </NuxtLink>
          <button type="submit" class="btn-primary" :disabled="saving">
            {{ saving ? 'Enregistrement...' : (isNew ? 'Créer' : 'Enregistrer') }}
          </button>
        </div>
      </form>

      <!-- Emails Section (only show for existing sequences) -->
      <div v-if="!isNew && sequenceId" class="form-section">
        <div class="section-header">
          <h2>📧 Emails de la séquence</h2>
          <button type="button" @click="showAddEmail = true" class="btn-add">
            + Ajouter un email
          </button>
        </div>

        <div v-if="emails.length === 0" class="empty-emails">
          <p>Aucun email dans cette séquence.</p>
          <p class="hint">Ajoutez des emails pour planifier votre séquence de nurturing.</p>
        </div>

        <div v-else class="emails-list">
          <div 
            v-for="email in sortedEmails" 
            :key="email.id" 
            class="email-item"
          >
            <div class="email-order">{{ email.order_index }}</div>
            <div class="email-content">
              <div class="email-subject">{{ email.subject }}</div>
              <div class="email-meta">
                <span v-if="email.order_index === 1">
                  📅 Envoyé à la confirmation
                </span>
                <span v-else>
                  ⏱️ {{ email.delay_days }} jour(s) après l'email précédent
                </span>
              </div>
              <div v-if="email.notes" class="email-notes">
                💡 {{ email.notes }}
              </div>
            </div>
            <div class="email-actions">
              <button @click="editEmail(email)" class="btn-icon" title="Modifier">
                ✏️
              </button>
              <button @click="deleteEmail(email.id)" class="btn-icon danger" title="Supprimer">
                🗑️
              </button>
            </div>
          </div>
        </div>

        <!-- Info about manual planning -->
        <div class="manual-info">
          <p>ℹ️ <strong>Phase 1:</strong> Ces séquences sont pour la planification manuelle. 
          L'envoi automatique sera disponible dans une prochaine version.</p>
        </div>
      </div>

      <!-- Add/Edit Email Modal -->
      <div v-if="showAddEmail || editingEmail" class="modal-overlay" @click.self="closeEmailModal">
        <div class="modal">
          <div class="modal-header">
            <h3>{{ editingEmail ? 'Modifier l\'email' : 'Ajouter un email' }}</h3>
            <button type="button" @click="closeEmailModal" class="modal-close">✕</button>
          </div>
          <form @submit.prevent="handleEmailSubmit" class="modal-body">
            <div class="form-group">
              <label for="email_order">Position *</label>
              <input
                id="email_order"
                v-model.number="emailForm.order_index"
                type="number"
                min="1"
                required
                class="input"
              />
            </div>

            <div class="form-group">
              <label for="email_subject">Sujet *</label>
              <input
                id="email_subject"
                v-model="emailForm.subject"
                type="text"
                required
                placeholder="Sujet de l'email"
                class="input"
              />
            </div>

            <div class="form-group">
              <label for="email_delay">Délai (jours)</label>
              <input
                id="email_delay"
                v-model.number="emailForm.delay_days"
                type="number"
                min="0"
                class="input"
              />
              <p class="help-text">Nombre de jours après l'email précédent (ou après confirmation pour le 1er)</p>
            </div>

            <div class="form-group">
              <label for="email_notes">Notes</label>
              <textarea
                id="email_notes"
                v-model="emailForm.notes"
                rows="2"
                placeholder="Notes internes sur cet email"
                class="input"
              />
            </div>

            <div class="modal-actions">
              <button type="button" @click="closeEmailModal" class="btn-secondary">
                Annuler
              </button>
              <button type="submit" class="btn-primary">
                {{ editingEmail ? 'Modifier' : 'Ajouter' }}
              </button>
            </div>
          </form>
        </div>
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

const sequenceId = computed(() => route.params.id as string);
const isNew = computed(() => sequenceId.value === 'new');

const form = ref({
  name: '',
  description: '',
  status: 'draft',
});

const emails = ref<any[]>([]);
const saving = ref(false);
const showAddEmail = ref(false);
const editingEmail = ref<any>(null);

const emailForm = ref({
  order_index: 1,
  subject: '',
  delay_days: 0,
  notes: '',
  template_id: null as string | null,
});

const sortedEmails = computed(() => 
  [...emails.value].sort((a, b) => a.order_index - b.order_index)
);

// Load sequence if editing
const { data: sequenceResponse, pending: loading, error, refresh } = isNew.value
  ? { data: ref(null), pending: ref(false), error: ref(null), refresh: () => {} }
  : useFetch(() => `/api/admin/nurture-sequences/${sequenceId.value}`, {
      credentials: 'include',
    });

// Populate form when sequence loads
watch(sequenceResponse, (response) => {
  if (response?.data) {
    form.value = {
      name: response.data.name,
      description: response.data.description || '',
      status: response.data.status,
    };
    emails.value = response.data.emails || [];
  }
}, { immediate: true });

async function handleSubmit() {
  if (saving.value) return;
  
  saving.value = true;
  
  try {
    if (isNew.value) {
      const response = await $fetch<{ data: { id: string } }>('/api/admin/nurture-sequences', {
        method: 'POST',
        credentials: 'include',
        body: form.value,
      });
      
      // Redirect to edit page to add emails
      router.push(`/lead-magnet/nurture-sequences/${response.data.id}`);
    } else {
      await $fetch(`/api/admin/nurture-sequences/${sequenceId.value}`, {
        method: 'PUT',
        credentials: 'include',
        body: form.value,
      });
      
      // Just show success, stay on page
      alert('✅ Séquence mise à jour');
    }
  } catch (err: any) {
    alert(`❌ Erreur: ${err.message || 'Erreur lors de l\'enregistrement'}`);
  } finally {
    saving.value = false;
  }
}

function closeEmailModal() {
  showAddEmail.value = false;
  editingEmail.value = null;
  emailForm.value = {
    order_index: emails.value.length + 1,
    subject: '',
    delay_days: 0,
    notes: '',
    template_id: null,
  };
}

function editEmail(email: any) {
  editingEmail.value = email;
  emailForm.value = {
    order_index: email.order_index,
    subject: email.subject,
    delay_days: email.delay_days,
    notes: email.notes || '',
    template_id: email.template_id,
  };
}

async function handleEmailSubmit() {
  try {
    if (editingEmail.value) {
      // Update existing email
      await $fetch(`/api/admin/nurture-sequences/${sequenceId.value}/emails/${editingEmail.value.id}`, {
        method: 'PUT',
        credentials: 'include',
        body: emailForm.value,
      });
    } else {
      // Create new email
      await $fetch(`/api/admin/nurture-sequences/${sequenceId.value}/emails`, {
        method: 'POST',
        credentials: 'include',
        body: emailForm.value,
      });
    }
    
    closeEmailModal();
    refresh();
  } catch (err: any) {
    alert(`❌ Erreur: ${err.message || 'Erreur lors de l\'enregistrement'}`);
  }
}

async function deleteEmail(emailId: string) {
  if (!confirm('Supprimer cet email de la séquence ?')) return;
  
  try {
    await $fetch(`/api/admin/nurture-sequences/${sequenceId.value}/emails/${emailId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    
    refresh();
  } catch (err: any) {
    alert(`❌ Erreur: ${err.message || 'Erreur lors de la suppression'}`);
  }
}
</script>

<style scoped>
.sequence-edit-page {
  max-width: 900px;
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
}

.loading, .error {
  text-align: center;
  padding: 3rem;
  background: white;
  border-radius: 12px;
}

.sequence-form-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.form-section h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #213E60;
  margin: 0 0 1.5rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #E0E0E0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #E0E0E0;
}

.section-header h2 {
  margin: 0;
  padding: 0;
  border: none;
}

.btn-add {
  padding: 0.5rem 1rem;
  background: #213E60;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  color: #213E60;
  margin-bottom: 0.5rem;
}

.input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #E0E0E0;
  border-radius: 8px;
  font-size: 1rem;
}

.input:focus {
  outline: none;
  border-color: #FFCC2B;
}

.help-text {
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.5rem;
}

.form-actions, .modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.btn-primary, .btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: #FFCC2B;
  color: #213E60;
}

.btn-secondary {
  background: #E0E0E0;
  color: #213E60;
}

/* Emails List */
.empty-emails {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.empty-emails .hint {
  font-size: 0.875rem;
}

.emails-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.email-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: #F4F2EF;
  border-radius: 8px;
}

.email-order {
  width: 32px;
  height: 32px;
  background: #213E60;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
}

.email-content {
  flex: 1;
}

.email-subject {
  font-weight: 600;
  color: #213E60;
  margin-bottom: 0.25rem;
}

.email-meta {
  font-size: 0.875rem;
  color: #666;
}

.email-notes {
  font-size: 0.875rem;
  color: #999;
  font-style: italic;
  margin-top: 0.5rem;
}

.email-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.btn-icon:hover {
  opacity: 1;
}

.btn-icon.danger:hover {
  color: #c62828;
}

.manual-info {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #E3F2FD;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #1565C0;
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
  max-width: 500px;
  width: 90%;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #E0E0E0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #213E60;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.modal-body {
  padding: 1.5rem;
}

@media (max-width: 768px) {
  .sequence-edit-page {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .email-item {
    flex-direction: column;
  }

  .email-order {
    align-self: flex-start;
  }

  .email-actions {
    align-self: flex-end;
  }
}
</style>
