import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, computed } from 'vue';
import { setupNuxtMocks, resetNuxtMocks, mockFetch } from '../../utils/nuxt-mocks';

// Setup mocks before importing components
beforeAll(() => {
  setupNuxtMocks();
  // Mock useToast
  // @ts-expect-error - global mock
  globalThis.useToast = () => ({
    add: vi.fn(),
  });
});

// Import component after mocks are setup
import ProspectImportModal from '~/components/Prospect/ImportModal.vue';

describe('Prospect/ImportModal.vue', () => {
  const mockFile = new File(['company_name,contact_email\nAcme,test@acme.com'], 'test.csv', {
    type: 'text/csv',
  });

  const mockUploadResult = {
    uploadId: 'upload-123',
    filename: 'test.csv',
    fileSize: 1024,
    rowCount: 1,
    uploadedAt: '2026-01-14T10:00:00Z',
  };

  let mockSelectFile: ReturnType<typeof vi.fn>;
  let mockClearFile: ReturnType<typeof vi.fn>;
  let mockUploadFile: ReturnType<typeof vi.fn>;
  let mockDownloadTemplate: ReturnType<typeof vi.fn>;
  let mockFileRef: ReturnType<typeof ref>;
  let mockUploadingRef: ReturnType<typeof ref>;
  let mockErrorRef: ReturnType<typeof ref>;

  beforeEach(() => {
    resetNuxtMocks();

    // Reset mock functions
    mockSelectFile = vi.fn();
    mockClearFile = vi.fn();
    mockUploadFile = vi.fn().mockResolvedValue(mockUploadResult);
    mockDownloadTemplate = vi.fn();
    mockFileRef = ref(null);
    mockUploadingRef = ref(false);
    mockErrorRef = ref(null);

    // Setup useProspectImport mock
    // @ts-expect-error - global mock
    globalThis.useProspectImport = () => ({
      file: mockFileRef,
      uploading: mockUploadingRef,
      error: mockErrorRef,
      fileSize: computed(() => (mockFileRef.value ? '1.0 KB' : '')),
      canContinue: computed(
        () => mockFileRef.value !== null && !mockErrorRef.value && !mockUploadingRef.value
      ),
      selectFile: mockSelectFile,
      clearFile: mockClearFile,
      uploadFile: mockUploadFile,
      downloadTemplate: mockDownloadTemplate,
    });
  });

  const mountModal = (props = { campaignId: 'campaign-123', modelValue: true }) => {
    return mount(ProspectImportModal, {
      props,
      global: {
        stubs: {
          UModal: {
            template: '<div class="modal" v-if="modelValue"><slot /></div>',
            props: ['modelValue', 'ui', 'aria'],
          },
          UCard: {
            template:
              '<div class="card"><slot name="header" /><slot /><slot name="footer" /></div>',
          },
          UButton: {
            template:
              '<button @click="$emit(\'click\')" :disabled="disabled" :loading="loading"><slot /></button>',
            props: [
              'color',
              'variant',
              'icon',
              'disabled',
              'loading',
              'size',
              'trailing',
              'ariaLabel',
            ],
          },
          UIcon: {
            template: '<span class="icon" :class="name"></span>',
            props: ['name'],
          },
          UAlert: {
            template: '<div class="alert" role="alert" :class="color"><slot />{{ title }}</div>',
            props: ['color', 'variant', 'icon', 'title', 'role', 'ariaLive'],
          },
        },
      },
    });
  };

  describe('Modal Display', () => {
    it('should render modal with correct title', async () => {
      const wrapper = mountModal();

      expect(wrapper.text()).toContain('Importer des Prospects');
    });

    it('should display CSV format requirements', async () => {
      const wrapper = mountModal();

      expect(wrapper.text()).toContain('company_name');
      expect(wrapper.text()).toContain('contact_email');
      expect(wrapper.text()).toContain('contact_name');
      expect(wrapper.text()).toContain('website_url');
    });

    it('should show example CSV row', async () => {
      const wrapper = mountModal();

      expect(wrapper.text()).toContain('Acme Corp');
      expect(wrapper.text()).toContain('sarah@acmecorp.com');
    });
  });

  describe('File Upload Area', () => {
    it('should display upload instructions when no file selected', async () => {
      const wrapper = mountModal();

      // Look for the label text that contains "Choisir un fichier"
      const label = wrapper.find('label[for="file-upload"]');
      expect(label.exists()).toBe(true);
      expect(label.text()).toContain('Choisir un fichier');
    });

    it('should have file input that accepts CSV and XLSX files', async () => {
      const wrapper = mountModal();

      const fileInput = wrapper.find('input#file-upload');
      expect(fileInput.exists()).toBe(true);
      expect(fileInput.attributes('accept')).toBe('.csv,.xlsx');
    });
  });

  describe('Template Download', () => {
    it('should have a download template button', async () => {
      const wrapper = mountModal();

      expect(wrapper.text()).toContain('Télécharger un modèle CSV');
    });
  });

  describe('Modal Actions', () => {
    it('should have Cancel and Continue buttons', async () => {
      const wrapper = mountModal();

      const buttons = wrapper.findAll('button');
      const buttonTexts = buttons.map((b) => b.text());

      expect(buttonTexts.some((text) => text.includes('Annuler'))).toBe(true);
      expect(
        buttonTexts.some((text) => text.includes('Continuer') || text.includes('validation'))
      ).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should render modal structure correctly', async () => {
      const wrapper = mountModal();

      // Modal should have proper structure
      expect(wrapper.find('.modal').exists()).toBe(true);
      expect(wrapper.find('.card').exists()).toBe(true);
    });

    it('should have accessible file input with label', async () => {
      const wrapper = mountModal();

      const fileInput = wrapper.find('input#file-upload');
      expect(fileInput.exists()).toBe(true);

      const label = wrapper.find('label[for="file-upload"]');
      expect(label.exists()).toBe(true);
    });
  });
});
