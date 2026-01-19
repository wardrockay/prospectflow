/**
 * Prospect import composable
 * Handles CSV file upload logic and validation
 */
import type { ValidationResult } from '~/types/validation.types';

interface UploadResult {
  uploadId: string;
  filename: string;
  fileSize: number;
  rowCount: number;
  uploadedAt: string;
}

export const useProspectImport = (campaignId: string) => {
  const file = ref<File | null>(null);
  const uploading = ref(false);
  const uploadProgress = ref(0);
  const error = ref<string | null>(null);

  /**
   * Formatted file size
   */
  const fileSize = computed(() => {
    if (!file.value) return '';

    const bytes = file.value.size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  });

  /**
   * Can continue to upload
   */
  const canContinue = computed(() => {
    return file.value !== null && !error.value && !uploading.value;
  });

  /**
   * Select file and validate
   */
  const selectFile = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const selectedFile = input.files?.[0];

    if (!selectedFile) {
      return;
    }

    // Reset error
    error.value = null;

    // Validate file type
    if (!selectedFile.name.match(/\.(csv|xlsx)$/i)) {
      error.value = 'Veuillez uploader un fichier CSV (.csv) ou Excel (.xlsx)';
      file.value = null;
      return;
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      error.value = 'Fichier trop volumineux (max 50 MB)';
      file.value = null;
      return;
    }

    file.value = selectedFile;
  };

  /**
   * Clear selected file
   */
  const clearFile = () => {
    file.value = null;
    error.value = null;
    uploadProgress.value = 0;
  };

  /**
   * Upload file to backend with progress tracking (AC3)
   * Uses XMLHttpRequest for progress events when in real browser,
   * falls back to $fetch for SSR/testing environments
   */
  const uploadFile = async (): Promise<UploadResult> => {
    console.log('[useProspectImport] 🚀 uploadFile() appelé');
    
    if (!file.value) {
      console.error('[useProspectImport] ❌ Aucun fichier sélectionné');
      throw new Error('Aucun fichier sélectionné');
    }

    console.log('[useProspectImport] 📁 Fichier:', file.value.name, 'Type:', file.value.type, 'Taille:', file.value.size);
    
    uploading.value = true;
    uploadProgress.value = 0;
    error.value = null;

    const formData = new FormData();
    formData.append('file', file.value);
    console.log('[useProspectImport] 📦 FormData créé');

    // Check if we're in a real browser (not happy-dom/jsdom/SSR)
    // happy-dom sets navigator.userAgent to 'Mozilla/5.0 (X11; Linux x64) AppleWebKit/537.36...'
    // but doesn't properly support FormData with XMLHttpRequest
    const isRealBrowser = typeof window !== 'undefined' && 
                          typeof XMLHttpRequest !== 'undefined' && 
                          typeof window.FormData !== 'undefined' &&
                          !import.meta.env.TEST &&
                          !import.meta.env.SSR;
    
    console.log('[useProspectImport] 🌐 Mode:', isRealBrowser ? 'Browser (XMLHttpRequest)' : 'SSR/Test ($fetch)');

    try {
      if (isRealBrowser) {
        // Use XMLHttpRequest for progress tracking in browser
        console.log('[useProspectImport] 📡 Utilisation de XMLHttpRequest');
        return await new Promise<UploadResult>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              uploadProgress.value = progress;
              console.log(`[useProspectImport] 📊 Progression: ${progress}% (${event.loaded}/${event.total})`);
            }
          });

          xhr.addEventListener('load', () => {
            console.log('[useProspectImport] 📥 Réponse reçue:', xhr.status, xhr.statusText);
            uploading.value = false;
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                console.log('[useProspectImport] 📄 Parsing de la réponse...');
                const response = JSON.parse(xhr.responseText);
                console.log('[useProspectImport] 📋 Réponse parsée:', response);
                if (response.success) {
                  uploadProgress.value = 100;
                  console.log('[useProspectImport] ✅ Upload réussi:', response.data);
                  resolve(response.data);
                } else {
                  error.value = "Échec de l'upload";
                  console.error('[useProspectImport] ❌ response.success = false');
                  reject(new Error("Échec de l'upload"));
                }
              } catch (parseErr) {
                error.value = 'Réponse invalide du serveur';
                console.error('[useProspectImport] ❌ Erreur de parsing:', parseErr);
                console.error('[useProspectImport] 📄 Texte reçu:', xhr.responseText);
                reject(new Error('Réponse invalide du serveur'));
              }
            } else {
              try {
                const errorResponse = JSON.parse(xhr.responseText);
                const errMsg = errorResponse.message || `Erreur ${xhr.status}`;
                error.value = errMsg;
                console.error('[useProspectImport] ❌ Erreur HTTP:', xhr.status, errMsg);
                reject(new Error(errMsg));
              } catch {
                error.value = `Erreur ${xhr.status}`;
                console.error('[useProspectImport] ❌ Erreur HTTP:', xhr.status, xhr.responseText);
                reject(new Error(`Erreur ${xhr.status}`));
              }
            }
          });

          xhr.addEventListener('error', () => {
            uploading.value = false;
            error.value = 'Erreur réseau';
            console.error('[useProspectImport] ❌ Erreur réseau XHR');
            reject(new Error('Erreur réseau'));
          });

          xhr.addEventListener('abort', () => {
            uploading.value = false;
            error.value = 'Upload annulé';
            console.warn('[useProspectImport] ⚠️ Upload annulé');
            reject(new Error('Upload annulé'));
          });

          const url = `/api/campaigns/${campaignId}/prospects/upload`;
          console.log('[useProspectImport] 🎯 URL:', url);
          xhr.open('POST', url);
          console.log('[useProspectImport] 📤 Envoi de la requête XHR...');
          xhr.send(formData);
        });
      } else {
        // Fallback to $fetch for SSR/testing
        console.log('[useProspectImport] 🔄 Utilisation de $fetch (SSR/Test)');
        const url = `/api/campaigns/${campaignId}/prospects/upload`;
        console.log('[useProspectImport] 🎯 URL:', url);
        
        const response = await $fetch<{ success: boolean; data: UploadResult }>(
          url,
          {
            method: 'POST',
            body: formData,
          }
        );

        console.log('[useProspectImport] 📥 Réponse $fetch:', response);

        if (!response.success) {
          console.error('[useProspectImport] ❌ response.success = false');
          throw new Error("Échec de l'upload");
        }

        uploadProgress.value = 100;
        console.log('[useProspectImport] ✅ Upload réussi:', response.data);
        return response.data;
      }
    } catch (err: any) {
      console.error('[useProspectImport] ❌ Erreur catch:', err);
      error.value = err.data?.message || err.message || "Erreur lors de l'upload";
      throw err;
    } finally {
      uploading.value = false;
    }
  };

  /**
   * Download CSV template
   */
  const downloadTemplate = async () => {
    try {
      // Use server proxy for authenticated download
      const link = document.createElement('a');
      link.href = '/api/campaigns/prospects/template';
      link.download = 'prospect_import_template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('Template download failed:', err);
      throw err;
    }
  };

  /**
   * Validate prospect data
   */
  const validateData = async (uploadId: string): Promise<ValidationResult> => {
    try {
      const response = await $fetch<{ success: boolean; data: ValidationResult }>(
        `/api/imports/${uploadId}/validate-data`,
        {
          method: 'POST',
        }
      );

      if (!response.success) {
        throw new Error('Validation failed');
      }

      return response.data;
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Validation error';
      throw err;
    }
  };

  return {
    file,
    uploading,
    uploadProgress,
    error,
    fileSize,
    canContinue,
    selectFile,
    clearFile,
    uploadFile,
    downloadTemplate,
    validateData,
  };
};
