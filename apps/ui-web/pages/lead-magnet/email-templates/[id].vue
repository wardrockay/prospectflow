<template>
  <div class="template-edit-page">
    <div class="page-header">
      <NuxtLink to="/lead-magnet/email-templates" class="btn-back">
        ← Retour aux templates
      </NuxtLink>
      <h1>{{ isNew ? '➕ Nouveau Template' : '✏️ Modifier Template' }}</h1>
    </div>

    <div v-if="loading && !isNew" class="loading">
      <p>Chargement du template...</p>
    </div>

    <div v-else-if="error && !isNew" class="error">
      <p>❌ Erreur lors du chargement</p>
      <NuxtLink to="/lead-magnet/email-templates" class="btn-secondary">
        Retour à la liste
      </NuxtLink>
    </div>

    <form v-else @submit.prevent="handleSubmit" class="template-form">
      <div class="form-section">
        <h2>Informations</h2>
        
        <div class="form-group">
          <label for="name">Nom du template *</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            required
            placeholder="Ex: Confirmation Double Opt-in"
            class="input"
          />
        </div>

        <div class="form-group">
          <label for="subject">Sujet de l'email *</label>
          <input
            id="subject"
            v-model="form.subject"
            type="text"
            required
            placeholder="Ex: Confirmez votre téléchargement"
            class="input"
          />
          <p class="help-text">Variables disponibles: <code>{{email}}</code>, <code>{{subscriber_name}}</code></p>
        </div>

        <div class="form-group">
          <label for="description">Description (optionnel)</label>
          <textarea
            id="description"
            v-model="form.description"
            rows="2"
            placeholder="Description interne du template"
            class="input"
          />
        </div>
      </div>

      <div class="form-section">
        <div class="section-header">
          <h2>Contenu HTML</h2>
          <button type="button" @click="handlePreview" class="btn-preview" :disabled="!form.html_body">
            👁️ Prévisualiser
          </button>
        </div>

        <div class="form-group">
          <label for="html_body">Corps de l'email (HTML) *</label>
          <textarea
            id="html_body"
            v-model="form.html_body"
            rows="15"
            required
            placeholder="<html>...</html>"
            class="input code"
          />
          <p class="help-text">
            Variables disponibles: 
            <code>{{email}}</code>, 
            <code>{{download_url}}</code>, 
            <code>{{subscriber_name}}</code>
          </p>
        </div>
      </div>

      <!-- Preview Modal -->
      <div v-if="showPreview" class="modal-overlay" @click.self="showPreview = false">
        <div class="modal preview-modal">
          <div class="modal-header">
            <h3>Prévisualisation</h3>
            <button type="button" @click="showPreview = false" class="modal-close">✕</button>
          </div>
          <div class="modal-body">
            <div class="preview-subject">
              <strong>Sujet:</strong> {{ form.subject }}
            </div>
            <div class="preview-content" v-html="previewHtml"></div>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <NuxtLink to="/lead-magnet/email-templates" class="btn-secondary">
          Annuler
        </NuxtLink>
        <button type="submit" class="btn-primary" :disabled="saving">
          {{ saving ? 'Enregistrement...' : (isNew ? 'Créer' : 'Enregistrer') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const router = useRouter();

definePageMeta({
  layout: 'default',
  middleware: 'auth',
});

const templateId = computed(() => route.params.id as string);
const isNew = computed(() => templateId.value === 'new');

const form = ref({
  name: '',
  subject: '',
  html_body: '',
  description: '',
});

const saving = ref(false);
const showPreview = ref(false);
const previewHtml = ref('');

// Load template if editing
const { data: templateResponse, pending: loading, error } = isNew.value
  ? { data: ref(null), pending: ref(false), error: ref(null) }
  : useFetch(() => `/api/admin/email-templates/${templateId.value}`, {
      credentials: 'include',
    });

// Populate form when template loads
watch(templateResponse, (response) => {
  if (response?.data) {
    form.value = {
      name: response.data.name,
      subject: response.data.subject,
      html_body: response.data.html_body,
      description: response.data.description || '',
    };
  }
}, { immediate: true });

async function handlePreview() {
  try {
    const response = await $fetch<{ success: boolean; data: { preview_html: string } }>(
      '/api/admin/email-templates/preview',
      {
        method: 'POST',
        credentials: 'include',
        body: {
          html_body: form.value.html_body,
          sample_data: {
            email: 'exemple@email.com',
            download_url: 'https://example.com/download/sample-token',
            subscriber_name: 'Jean Dupont',
          },
        },
      }
    );
    
    previewHtml.value = response.data.preview_html;
    showPreview.value = true;
  } catch (err) {
    alert('❌ Erreur lors de la prévisualisation');
    console.error(err);
  }
}

async function handleSubmit() {
  if (saving.value) return;
  
  saving.value = true;
  
  try {
    if (isNew.value) {
      await $fetch('/api/admin/email-templates', {
        method: 'POST',
        credentials: 'include',
        body: form.value,
      });
    } else {
      await $fetch(`/api/admin/email-templates/${templateId.value}`, {
        method: 'PUT',
        credentials: 'include',
        body: form.value,
      });
    }
    
    router.push('/lead-magnet/email-templates');
  } catch (err: any) {
    alert(`❌ Erreur: ${err.message || 'Erreur lors de l\'enregistrement'}`);
    console.error(err);
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.template-edit-page {
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

.btn-back:hover {
  background: #E8E6E3;
}

.loading, .error {
  text-align: center;
  padding: 3rem;
  background: white;
  border-radius: 12px;
}

.template-form {
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

.form-group {
  margin-bottom: 1.5rem;
}

.form-group:last-child {
  margin-bottom: 0;
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
  transition: border-color 0.2s;
}

.input:focus {
  outline: none;
  border-color: #FFCC2B;
}

.input.code {
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 0.9rem;
  background: #F8F9FA;
}

.help-text {
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.5rem;
}

.help-text code {
  background: #F0F0F0;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-family: monospace;
}

.btn-preview {
  padding: 0.5rem 1rem;
  background: #94B6EF;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
}

.btn-preview:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
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

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #E0E0E0;
  color: #213E60;
}

/* Preview Modal */
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
  max-width: 700px;
  width: 90%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.preview-modal {
  max-width: 800px;
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
  overflow-y: auto;
}

.preview-subject {
  padding: 0.75rem;
  background: #F4F2EF;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.preview-content {
  border: 1px solid #E0E0E0;
  border-radius: 8px;
  padding: 1rem;
  background: white;
}

@media (max-width: 768px) {
  .template-edit-page {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-actions {
    flex-direction: column;
  }

  .form-actions > * {
    width: 100%;
    text-align: center;
  }
}
</style>
