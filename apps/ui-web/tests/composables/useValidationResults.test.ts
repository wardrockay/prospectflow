import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useValidationResults } from '~/composables/useValidationResults';

// Mock $fetch globally
global.$fetch = vi.fn();

describe('useValidationResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { loading, error, validationResult, importing, importSummary } = 
        useValidationResults('upload-123', 'campaign-456');

      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
      expect(validationResult.value).toBeNull();
      expect(importing.value).toBe(false);
      expect(importSummary.value).toBeNull();
    });
  });

  describe('fetchValidationResults', () => {
    it('should fetch validation results successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          validCount: 90,
          invalidCount: 10,
          totalErrorCount: 10,
          duplicateCount: 0,
          errors: [],
          validRows: [],
          invalidRows: [],
        },
      };

      (global.$fetch as any).mockResolvedValue(mockResponse);

      const { fetchValidationResults, validationResult, loading, error } = 
        useValidationResults('upload-123', 'campaign-456');

      expect(loading.value).toBe(false);

      const result = await fetchValidationResults();

      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
      expect(validationResult.value).toEqual(mockResponse.data);
      expect(result).toEqual(mockResponse.data);
      expect(global.$fetch).toHaveBeenCalledWith(
        '/api/imports/upload-123/validate-data',
        expect.objectContaining({
          method: 'POST',
          body: { overrideDuplicates: false },
        })
      );
    });

    it('should set loading state during fetch', async () => {
      const mockResponse = {
        success: true,
        data: {
          validCount: 90,
          invalidCount: 10,
          totalErrorCount: 10,
          duplicateCount: 0,
          errors: [],
          validRows: [],
          invalidRows: [],
        },
      };

      let resolveFetch: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      (global.$fetch as any).mockReturnValue(fetchPromise);

      const { fetchValidationResults, loading } = 
        useValidationResults('upload-123', 'campaign-456');

      const promise = fetchValidationResults();
      
      // Loading should be true while fetching
      expect(loading.value).toBe(true);

      // Resolve the fetch
      resolveFetch!(mockResponse);
      await promise;

      // Loading should be false after fetch
      expect(loading.value).toBe(false);
    });

    it('should handle validation fetch error', async () => {
      const mockError = new Error('Network error');
      (global.$fetch as any).mockRejectedValue(mockError);

      const { fetchValidationResults, error, loading } = 
        useValidationResults('upload-123', 'campaign-456');

      await expect(fetchValidationResults()).rejects.toThrow();
      
      expect(error.value).toBe('Network error');
      expect(loading.value).toBe(false);
    });

    it('should handle API error response with message', async () => {
      const mockError = {
        data: { message: 'Upload not found' },
        message: 'Upload not found',
        statusCode: 404,
      };

      (global.$fetch as any).mockRejectedValue(mockError);

      const { fetchValidationResults, error } = 
        useValidationResults('upload-123', 'campaign-456');

      await expect(fetchValidationResults()).rejects.toThrow();
      
      expect(error.value).toBe('Upload not found');
    });

    it('should clear previous error when fetching again', async () => {
      const mockError = new Error('First error');
      (global.$fetch as any).mockRejectedValueOnce(mockError);

      const { fetchValidationResults, error } = 
        useValidationResults('upload-123', 'campaign-456');

      // First fetch fails
      await expect(fetchValidationResults()).rejects.toThrow();
      expect(error.value).not.toBeNull();

      // Second fetch succeeds
      const mockResponse = {
        success: true,
        data: {
          validCount: 90,
          invalidCount: 10,
          totalErrorCount: 10,
          duplicateCount: 0,
          errors: [],
          validRows: [],
          invalidRows: [],
        },
      };

      (global.$fetch as any).mockResolvedValue(mockResponse);

      await fetchValidationResults();

      // Error should be cleared
      expect(error.value).toBeNull();
    });
  });

  describe('executeImport', () => {
    it('should execute import successfully', async () => {
      const mockValidationResult = {
        validCount: 90,
        invalidCount: 10,
        totalErrorCount: 10,
        duplicateCount: 0,
        errors: [],
        validRows: [{ company_name: 'Test', contact_email: 'test@test.com' }],
        invalidRows: [],
      };

      const mockImportResponse = {
        success: true,
        data: {
          imported: 90,
          failed: 0,
          prospectIds: ['prospect-1', 'prospect-2'],
        },
      };

      (global.$fetch as any)
        .mockResolvedValueOnce({ success: true, data: mockValidationResult })
        .mockResolvedValueOnce(mockImportResponse);

      const { fetchValidationResults, executeImport, importSummary, importing } = 
        useValidationResults('upload-123', 'campaign-456');

      // First fetch validation results
      await fetchValidationResults();

      expect(importing.value).toBe(false);

      // Then execute import
      const summary = await executeImport();

      expect(importing.value).toBe(false);
      expect(importSummary.value).toEqual(mockImportResponse.data);
      expect(summary).toEqual(mockImportResponse.data);
      expect(summary.imported).toBe(90);
      expect(global.$fetch).toHaveBeenCalledWith(
        '/api/prospects/import',
        expect.objectContaining({
          method: 'POST',
          body: {
            validationResult: mockValidationResult,
            campaignId: 'campaign-456',
          },
        })
      );
    });

    it('should set importing state during execution', async () => {
      const mockValidationResult = {
        validCount: 90,
        invalidCount: 10,
        totalErrorCount: 10,
        duplicateCount: 0,
        errors: [],
        validRows: [],
        invalidRows: [],
      };

      const mockImportResponse = {
        success: true,
        data: {
          imported: 90,
          failed: 0,
          prospectIds: [],
        },
      };

      let resolveImport: (value: any) => void;
      const importPromise = new Promise((resolve) => {
        resolveImport = resolve;
      });

      (global.$fetch as any)
        .mockResolvedValueOnce({ success: true, data: mockValidationResult })
        .mockReturnValueOnce(importPromise);

      const { fetchValidationResults, executeImport, importing } = 
        useValidationResults('upload-123', 'campaign-456');

      await fetchValidationResults();

      const promise = executeImport();
      
      // Importing should be true while executing
      expect(importing.value).toBe(true);

      // Resolve the import
      resolveImport!(mockImportResponse);
      await promise;

      // Importing should be false after execution
      expect(importing.value).toBe(false);
    });

    it('should throw error if validation result is missing', async () => {
      const { executeImport, error } = 
        useValidationResults('upload-123', 'campaign-456');

      await expect(executeImport()).rejects.toThrow(
        'Aucun résultat de validation disponible'
      );
    });

    it('should handle import failure', async () => {
      const mockValidationResult = {
        validCount: 90,
        invalidCount: 10,
        totalErrorCount: 10,
        duplicateCount: 0,
        errors: [],
        validRows: [],
        invalidRows: [],
      };

      const mockError = new Error('Database connection failed');

      (global.$fetch as any)
        .mockResolvedValueOnce({ success: true, data: mockValidationResult })
        .mockRejectedValueOnce(mockError);

      const { fetchValidationResults, executeImport, error, importing } = 
        useValidationResults('upload-123', 'campaign-456');

      await fetchValidationResults();

      await expect(executeImport()).rejects.toThrow();
      
      expect(error.value).toBe('Database connection failed');
      expect(importing.value).toBe(false);
    });

    it('should handle API error response with message', async () => {
      const mockValidationResult = {
        validCount: 90,
        invalidCount: 10,
        totalErrorCount: 10,
        duplicateCount: 0,
        errors: [],
        validRows: [],
        invalidRows: [],
      };

      const mockError = {
        data: { message: 'Campaign not found' },
        message: 'Campaign not found',
        statusCode: 404,
      };

      (global.$fetch as any)
        .mockResolvedValueOnce({ success: true, data: mockValidationResult })
        .mockRejectedValueOnce(mockError);

      const { fetchValidationResults, executeImport, error } = 
        useValidationResults('upload-123', 'campaign-456');

      await fetchValidationResults();

      await expect(executeImport()).rejects.toThrow();
      
      expect(error.value).toBe('Campaign not found');
    });

    it('should clear previous error when importing again', async () => {
      const mockValidationResult = {
        validCount: 90,
        invalidCount: 10,
        totalErrorCount: 10,
        duplicateCount: 0,
        errors: [],
        validRows: [],
        invalidRows: [],
      };

      const mockError = new Error('First import error');
      const mockSuccessResponse = {
        success: true,
        data: {
          imported: 90,
          failed: 0,
          prospectIds: [],
        },
      };

      (global.$fetch as any)
        .mockResolvedValueOnce({ success: true, data: mockValidationResult })
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockSuccessResponse);

      const { fetchValidationResults, executeImport, error } = 
        useValidationResults('upload-123', 'campaign-456');

      await fetchValidationResults();

      // First import fails
      await expect(executeImport()).rejects.toThrow();
      expect(error.value).not.toBeNull();

      // Second import succeeds
      await executeImport();

      // Error should be cleared
      expect(error.value).toBeNull();
    });
  });
});
