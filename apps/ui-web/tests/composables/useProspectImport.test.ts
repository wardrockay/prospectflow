import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { setupNuxtMocks, resetNuxtMocks, mockFetch } from '../utils/nuxt-mocks';

// Setup mocks before importing composable
beforeAll(() => {
  setupNuxtMocks();
});

// Import composable after mocks are setup
import { useProspectImport } from '~/composables/useProspectImport';

describe('useProspectImport', () => {
  const campaignId = 'campaign-123';

  beforeEach(() => {
    resetNuxtMocks();
  });

  describe('Initial State', () => {
    it('should have null file initially', () => {
      const { file } = useProspectImport(campaignId);
      expect(file.value).toBeNull();
    });

    it('should not be uploading initially', () => {
      const { uploading } = useProspectImport(campaignId);
      expect(uploading.value).toBe(false);
    });

    it('should have no error initially', () => {
      const { error } = useProspectImport(campaignId);
      expect(error.value).toBeNull();
    });

    it('should not allow continue initially', () => {
      const { canContinue } = useProspectImport(campaignId);
      expect(canContinue.value).toBe(false);
    });
  });

  describe('File Size Formatting', () => {
    it('should format bytes correctly', () => {
      const { file, fileSize, selectFile } = useProspectImport(campaignId);

      // Simulate file selection with small file
      const smallFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      Object.defineProperty(smallFile, 'size', { value: 500 });

      const event = { target: { files: [smallFile] } } as unknown as Event;
      selectFile(event);

      expect(file.value).not.toBeNull();
      expect(fileSize.value).toBe('500 B');
    });

    it('should format KB correctly', () => {
      const { file, fileSize, selectFile } = useProspectImport(campaignId);

      const kbFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      Object.defineProperty(kbFile, 'size', { value: 2048 });

      const event = { target: { files: [kbFile] } } as unknown as Event;
      selectFile(event);

      expect(fileSize.value).toBe('2.0 KB');
    });

    it('should format MB correctly', () => {
      const { file, fileSize, selectFile } = useProspectImport(campaignId);

      const mbFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      Object.defineProperty(mbFile, 'size', { value: 2 * 1024 * 1024 });

      const event = { target: { files: [mbFile] } } as unknown as Event;
      selectFile(event);

      expect(fileSize.value).toBe('2.0 MB');
    });
  });

  describe('File Type Validation', () => {
    it('should accept CSV files with .csv extension', () => {
      const { file, error, selectFile } = useProspectImport(campaignId);

      const csvFile = new File(['data'], 'prospects.csv', { type: 'text/csv' });
      const event = { target: { files: [csvFile] } } as unknown as Event;
      selectFile(event);

      expect(file.value).not.toBeNull();
      expect(error.value).toBeNull();
    });

    it('should accept Excel files (.xlsx)', () => {
      const { file, error, selectFile } = useProspectImport(campaignId);

      const xlsxFile = new File(['data'], 'prospects.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const event = { target: { files: [xlsxFile] } } as unknown as Event;
      selectFile(event);

      expect(file.value).not.toBeNull();
      expect(error.value).toBeNull();
    });

    it('should reject text files (.txt)', () => {
      const { file, error, selectFile } = useProspectImport(campaignId);

      const txtFile = new File(['data'], 'prospects.txt', { type: 'text/plain' });
      const event = { target: { files: [txtFile] } } as unknown as Event;
      selectFile(event);

      expect(file.value).toBeNull();
      expect(error.value).toContain('.xlsx');
    });
  });

  describe('File Size Validation', () => {
    it('should accept files under 50MB', () => {
      const { file, error, selectFile } = useProspectImport(campaignId);

      const smallFile = new File(['data'], 'prospects.csv', { type: 'text/csv' });
      Object.defineProperty(smallFile, 'size', { value: 1024 * 1024 }); // 1MB

      const event = { target: { files: [smallFile] } } as unknown as Event;
      selectFile(event);

      expect(file.value).not.toBeNull();
      expect(error.value).toBeNull();
    });

    it('should accept files at exactly 50MB', () => {
      const { file, error, selectFile } = useProspectImport(campaignId);

      const maxFile = new File(['data'], 'max.csv', { type: 'text/csv' });
      Object.defineProperty(maxFile, 'size', { value: 50 * 1024 * 1024 }); // 50MB

      const event = { target: { files: [maxFile] } } as unknown as Event;
      selectFile(event);

      expect(file.value).not.toBeNull();
      expect(error.value).toBeNull();
    });

    it('should reject files over 50MB', () => {
      const { file, error, selectFile } = useProspectImport(campaignId);

      const largeFile = new File(['data'], 'large.csv', { type: 'text/csv' });
      Object.defineProperty(largeFile, 'size', { value: 51 * 1024 * 1024 }); // 51MB

      const event = { target: { files: [largeFile] } } as unknown as Event;
      selectFile(event);

      expect(file.value).toBeNull();
      expect(error.value).toContain('50 MB');
    });
  });

  describe('Clear File', () => {
    it('should clear selected file and error', () => {
      const { file, error, selectFile, clearFile } = useProspectImport(campaignId);

      // First select a file
      const csvFile = new File(['data'], 'test.csv', { type: 'text/csv' });
      const event = { target: { files: [csvFile] } } as unknown as Event;
      selectFile(event);

      expect(file.value).not.toBeNull();

      // Clear file
      clearFile();

      expect(file.value).toBeNull();
      expect(error.value).toBeNull();
    });
  });

  describe('Can Continue', () => {
    it('should allow continue when file is selected and no error', () => {
      const { canContinue, selectFile } = useProspectImport(campaignId);

      const csvFile = new File(['data'], 'test.csv', { type: 'text/csv' });
      const event = { target: { files: [csvFile] } } as unknown as Event;
      selectFile(event);

      expect(canContinue.value).toBe(true);
    });

    it('should not allow continue when file has error', () => {
      const { canContinue, selectFile } = useProspectImport(campaignId);

      const largeFile = new File(['data'], 'large.csv', { type: 'text/csv' });
      Object.defineProperty(largeFile, 'size', { value: 51 * 1024 * 1024 }); // 51MB (over limit)

      const event = { target: { files: [largeFile] } } as unknown as Event;
      selectFile(event);

      expect(canContinue.value).toBe(false);
    });
  });

  describe('Upload File', () => {
    it('should throw error when no file selected', async () => {
      const { uploadFile } = useProspectImport(campaignId);

      await expect(uploadFile()).rejects.toThrow('Aucun fichier sélectionné');
    });

    it('should call API with correct endpoint and method', async () => {
      const { selectFile, uploadFile } = useProspectImport(campaignId);

      // Mock successful response
      mockFetch.mockResolvedValue({
        success: true,
        data: {
          uploadId: 'upload-456',
          filename: 'test.csv',
          fileSize: 1024,
          rowCount: 5,
          uploadedAt: '2026-01-14T10:00:00Z',
        },
      });

      // Select file
      const csvFile = new File(['company_name,email\nAcme,test@test.com'], 'test.csv', {
        type: 'text/csv',
      });
      const event = { target: { files: [csvFile] } } as unknown as Event;
      selectFile(event);

      // Upload
      const result = await uploadFile();

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/campaigns/${campaignId}/prospects/upload`,
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(result.uploadId).toBe('upload-456');
    });

    it('should set uploading state during upload', async () => {
      const { selectFile, uploadFile, uploading } = useProspectImport(campaignId);

      // Create a delayed mock
      let resolvePromise: (value: unknown) => void;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockFetch.mockReturnValue(delayedPromise);

      // Select file
      const csvFile = new File(['data'], 'test.csv', { type: 'text/csv' });
      const event = { target: { files: [csvFile] } } as unknown as Event;
      selectFile(event);

      // Start upload
      const uploadPromise = uploadFile();

      // Should be uploading
      expect(uploading.value).toBe(true);

      // Resolve the upload
      resolvePromise!({
        success: true,
        data: { uploadId: '123', filename: 'test.csv', fileSize: 100, rowCount: 1, uploadedAt: '' },
      });

      await uploadPromise;

      // Should no longer be uploading
      expect(uploading.value).toBe(false);
    });
  });

  describe('validateData', () => {
    it('should call validation endpoint with correct params', async () => {
      const mockResult = {
        validCount: 85,
        invalidCount: 15,
        totalErrorCount: 15,
        duplicateCount: 0,
        errors: [],
        validRows: [],
        invalidRows: [],
      };

      mockFetch.mockResolvedValue({
        success: true,
        data: mockResult,
      });

      const { validateData } = useProspectImport(campaignId);
      const result = await validateData('upload-123');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/imports/upload-123/validate-data',
        { method: 'POST' }
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle validation errors', async () => {
      mockFetch.mockRejectedValue(new Error('Validation failed'));

      const { validateData } = useProspectImport(campaignId);

      await expect(validateData('upload-123')).rejects.toThrow('Validation failed');
    });

    it('should return validation result with errors', async () => {
      const mockResult = {
        validCount: 50,
        invalidCount: 50,
        totalErrorCount: 75,
        duplicateCount: 0,
        errors: [
          {
            rowNumber: 1,
            field: 'contact_email',
            errorType: 'INVALID_EMAIL_FORMAT',
            message: 'Invalid email',
            originalValue: 'bad@',
          },
        ],
        validRows: [],
        invalidRows: [],
      };

      mockFetch.mockResolvedValue({
        success: true,
        data: mockResult,
      });

      const { validateData } = useProspectImport(campaignId);
      const result = await validateData('upload-456');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('contact_email');
    });
  });
});
