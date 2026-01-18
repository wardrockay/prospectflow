import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import ValidatePage from '~/pages/prospects/import/validate.vue';

// Mock composables
const mockFetchValidationResults = vi.fn();
const mockExecuteImport = vi.fn();
const mockPush = vi.fn();

vi.mock('~/composables/useValidationResults', () => ({
  useValidationResults: () => ({
    loading: { value: false },
    error: { value: null },
    validationResult: {
      value: {
        validCount: 90,
        invalidCount: 10,
        totalErrorCount: 10,
        duplicateCount: 0,
        errors: [],
        validRows: [],
        invalidRows: [],
      },
    },
    importing: { value: false },
    importSummary: { value: null },
    fetchValidationResults: mockFetchValidationResults,
    executeImport: mockExecuteImport,
  }),
}));

// Mock router
const mockRoute = {
  query: {
    upload_id: 'upload-123',
    campaign_id: 'campaign-456',
  },
};

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router');
  return {
    ...actual,
    useRoute: () => mockRoute,
    useRouter: () => ({
      push: mockPush,
    }),
  };
});

// Mock NuxtUI components
vi.mock('#app', () => ({
  definePageMeta: vi.fn(),
  useToast: () => ({
    add: vi.fn(),
  }),
  createError: (error: any) => error,
}));

describe('Validation Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Query Parameter Validation', () => {
    it('should throw error if uploadId is missing', () => {
      mockRoute.query.upload_id = '';
      
      expect(() => {
        // Component will throw during setup
        mount(ValidatePage, {
          global: {
            stubs: {
              UIcon: true,
              UAlert: true,
              ValidationResultsStep: true,
            },
          },
        });
      }).toThrow();
    });

    it('should throw error if campaignId is missing', () => {
      mockRoute.query.upload_id = 'upload-123';
      mockRoute.query.campaign_id = '';
      
      expect(() => {
        mount(ValidatePage, {
          global: {
            stubs: {
              UIcon: true,
              UAlert: true,
              ValidationResultsStep: true,
            },
          },
        });
      }).toThrow();
    });

    it('should throw error if uploadId is only whitespace', () => {
      mockRoute.query.upload_id = '   ';
      mockRoute.query.campaign_id = 'campaign-456';
      
      expect(() => {
        mount(ValidatePage, {
          global: {
            stubs: {
              UIcon: true,
              UAlert: true,
              ValidationResultsStep: true,
            },
          },
        });
      }).toThrow();
    });
  });

  describe('Component Mounting', () => {
    beforeEach(() => {
      mockRoute.query.upload_id = 'upload-123';
      mockRoute.query.campaign_id = 'campaign-456';
      mockFetchValidationResults.mockResolvedValue({
        validCount: 90,
        invalidCount: 10,
        totalErrorCount: 10,
        duplicateCount: 0,
        errors: [],
        validRows: [],
        invalidRows: [],
      });
    });

    it('should render page title', () => {
      const wrapper = mount(ValidatePage, {
        global: {
          stubs: {
            UIcon: true,
            UAlert: true,
            ValidationResultsStep: true,
          },
        },
      });

      expect(wrapper.text()).toContain('Résultats de validation');
    });

    it('should call fetchValidationResults on mount', async () => {
      mount(ValidatePage, {
        global: {
          stubs: {
            UIcon: true,
            UAlert: true,
            ValidationResultsStep: true,
          },
        },
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockFetchValidationResults).toHaveBeenCalledTimes(1);
    });

    it('should log error when fetchValidationResults fails', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetchValidationResults.mockRejectedValueOnce(new Error('Network error'));

      mount(ValidatePage, {
        global: {
          stubs: {
            UIcon: true,
            UAlert: true,
            ValidationResultsStep: true,
          },
        },
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(consoleError).toHaveBeenCalledWith(
        'Failed to fetch validation results:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      mockRoute.query.upload_id = 'upload-123';
      mockRoute.query.campaign_id = 'campaign-456';
    });

    it('should navigate back to mapping page', async () => {
      const wrapper = mount(ValidatePage, {
        global: {
          stubs: {
            UIcon: true,
            UAlert: true,
            ValidationResultsStep: {
              template: '<div @back="$emit(\'back\')"><button @click="$emit(\'back\')">Back</button></div>',
            },
          },
        },
      });

      const backButton = wrapper.find('button');
      await backButton.trigger('click');

      expect(mockPush).toHaveBeenCalledWith('/prospects/import/map?upload_id=upload-123');
    });
  });

  describe('Import Execution', () => {
    beforeEach(() => {
      mockRoute.query.upload_id = 'upload-123';
      mockRoute.query.campaign_id = 'campaign-456';
    });

    it('should execute import and navigate on success', async () => {
      mockExecuteImport.mockResolvedValue({
        imported: 90,
        failed: 0,
        prospectIds: ['p1', 'p2'],
      });

      const wrapper = mount(ValidatePage, {
        global: {
          stubs: {
            UIcon: true,
            UAlert: true,
            ValidationResultsStep: {
              template: '<div><button @click="$emit(\'import\')">Import</button></div>',
            },
          },
        },
      });

      const importButton = wrapper.find('button');
      await importButton.trigger('click');
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockExecuteImport).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/campaigns/campaign-456?tab=prospects');
    });

    it('should display error toast on import failure', async () => {
      const mockToastAdd = vi.fn();
      vi.mocked(vi.mocked(await import('#app')).useToast).mockReturnValue({
        add: mockToastAdd,
      } as any);

      mockExecuteImport.mockRejectedValue(new Error('Import failed'));

      const wrapper = mount(ValidatePage, {
        global: {
          stubs: {
            UIcon: true,
            UAlert: true,
            ValidationResultsStep: {
              template: '<div><button @click="$emit(\'import\')">Import</button></div>',
            },
          },
        },
      });

      const importButton = wrapper.find('button');
      await importButton.trigger('click');
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockToastAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Erreur d'import",
          color: 'red',
        })
      );
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockRoute.query.upload_id = 'upload-123';
      mockRoute.query.campaign_id = 'campaign-456';
    });

    it('should have screen reader announcement for validation results', () => {
      const wrapper = mount(ValidatePage, {
        global: {
          stubs: {
            UIcon: true,
            UAlert: true,
            ValidationResultsStep: true,
          },
        },
      });

      const srOnly = wrapper.findAll('[role="status"]');
      expect(srOnly.length).toBeGreaterThan(0);
      expect(srOnly[0].classes()).toContain('sr-only');
    });
  });
});
