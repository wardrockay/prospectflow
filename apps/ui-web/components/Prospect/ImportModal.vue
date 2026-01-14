<script setup lang="ts">
  interface Props {
    campaignId: string;
  }

  const props = defineProps<Props>();

  const emit = defineEmits<{
    close: [];
    uploaded: [uploadId: string];
  }>();

  // Composable for upload logic
  const {
    file,
    uploading,
    error,
    fileSize,
    canContinue,
    selectFile,
    clearFile,
    uploadFile,
    downloadTemplate,
  } = useProspectImport(props.campaignId);

  // Modal state
  const isOpen = defineModel<boolean>({ default: false });

  // Toast notifications
  const toast = useToast();

  /**
   * Handle file drop
   */
  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    const droppedFiles = event.dataTransfer?.files;
    if (droppedFiles && droppedFiles.length > 0) {
      selectFile({ target: { files: droppedFiles } } as any);
    }
  };

  /**
   * Handle file input change
   */
  const handleFileChange = (event: Event) => {
    selectFile(event);
  };

  /**
   * Handle continue to validation
   */
  const handleContinue = async () => {
    try {
      const result = await uploadFile();

      toast.add({
        title: 'Succès',
        description: `Fichier uploadé avec succès (${result.rowCount} prospects)`,
        color: 'green',
        icon: 'i-heroicons-check-circle',
      });

      emit('uploaded', result.uploadId);
      isOpen.value = false;
    } catch (err: any) {
      toast.add({
        title: 'Erreur',
        description: err.message || "Échec de l'upload",
        color: 'red',
        icon: 'i-heroicons-exclamation-triangle',
      });
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    clearFile();
    emit('close');
    isOpen.value = false;
  };

  /**
   * Handle template download
   */
  const handleDownloadTemplate = async () => {
    try {
      await downloadTemplate();

      toast.add({
        title: 'Téléchargement démarré',
        description: 'Le modèle CSV a été téléchargé',
        color: 'green',
        icon: 'i-heroicons-arrow-down-tray',
      });
    } catch (err: any) {
      toast.add({
        title: 'Erreur',
        description: 'Échec du téléchargement du modèle',
        color: 'red',
        icon: 'i-heroicons-exclamation-triangle',
      });
    }
  };
</script>

<template>
  <UModal
    v-model="isOpen"
    :ui="{ width: 'sm:max-w-2xl' }"
    :aria="{ labelledby: 'import-modal-title' }"
  >
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 id="import-modal-title" class="text-lg font-semibold">Importer des Prospects</h3>
          <UButton
            color="gray"
            variant="ghost"
            icon="i-heroicons-x-mark-20-solid"
            aria-label="Fermer"
            @click="handleCancel"
          />
        </div>
      </template>

      <div class="space-y-6">
        <!-- Format Requirements -->
        <div class="rounded-lg bg-blue-50 p-4">
          <h4 class="mb-2 font-medium text-blue-900">Format CSV Requis</h4>
          <p class="mb-2 text-sm text-blue-800">
            Votre fichier CSV doit contenir les colonnes suivantes :
          </p>
          <ul class="mb-3 list-inside list-disc space-y-1 text-sm text-blue-800">
            <li><strong>company_name</strong> (requis)</li>
            <li><strong>contact_email</strong> (requis)</li>
            <li><strong>contact_name</strong> (optionnel)</li>
            <li><strong>website_url</strong> (optionnel)</li>
          </ul>
          <p class="mb-3 text-xs text-blue-700">
            Exemple : Acme Corp,sarah@acmecorp.com,Sarah Johnson,https://acmecorp.com
          </p>
          <UButton
            size="xs"
            color="blue"
            variant="soft"
            icon="i-heroicons-arrow-down-tray"
            @click="handleDownloadTemplate"
          >
            Télécharger un modèle CSV
          </UButton>
        </div>

        <!-- File Upload Area -->
        <div
          class="relative rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-primary-500"
          :class="{ 'border-primary-500 bg-primary-50': file }"
          role="region"
          aria-label="Zone de téléchargement de fichier CSV"
          @drop="handleDrop"
          @dragover.prevent
        >
          <!-- No file selected -->
          <div v-if="!file" class="space-y-3">
            <div class="flex justify-center">
              <UIcon name="i-heroicons-cloud-arrow-up" class="h-12 w-12 text-gray-400" />
            </div>
            <div>
              <label
                for="file-upload"
                class="cursor-pointer font-medium text-primary-600 hover:text-primary-500"
              >
                Choisir un fichier
              </label>
              <span class="text-gray-600"> ou glisser-déposer</span>
            </div>
            <p class="text-sm text-gray-500">Fichiers CSV uniquement (.csv) - Max 5 MB</p>
            <input
              id="file-upload"
              type="file"
              accept=".csv"
              class="hidden"
              @change="handleFileChange"
            />
          </div>

          <!-- File selected -->
          <div v-else class="space-y-3">
            <div class="flex justify-center">
              <UIcon name="i-heroicons-document-check" class="h-12 w-12 text-primary-600" />
            </div>
            <div>
              <p class="font-medium text-gray-900">{{ file.name }}</p>
              <p class="text-sm text-gray-500">{{ fileSize }}</p>
            </div>
            <UButton size="sm" color="gray" variant="soft" @click="clearFile">
              Changer de fichier
            </UButton>
          </div>
        </div>

        <!-- Error Display -->
        <UAlert
          v-if="error"
          color="red"
          variant="soft"
          icon="i-heroicons-exclamation-triangle"
          :title="error"
          role="alert"
          aria-live="polite"
        />
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="gray" variant="soft" @click="handleCancel" :disabled="uploading">
            Annuler
          </UButton>
          <UButton
            color="primary"
            @click="handleContinue"
            :disabled="!canContinue"
            :loading="uploading"
          >
            {{ uploading ? 'Upload en cours...' : 'Continuer vers la validation' }}
          </UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>
