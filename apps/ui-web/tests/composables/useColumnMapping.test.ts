import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useColumnMapping } from '~/composables/useColumnMapping';
import type { ColumnDetectionResponse } from '~/types/csv.types';

// Mock $fetch
global.$fetch = vi.fn();

describe('useColumnMapping', () => {
  const mockUploadId = 'test-upload-123';

  const mockResponse: { success: boolean; data: ColumnDetectionResponse } = {
    success: true,
    data: {
      uploadId: mockUploadId,
      detectedColumns: ['company', 'email', 'website'],
      suggestedMappings: [
        { detected: 'company', suggested: 'company_name', confidence: 'high', required: true },
        { detected: 'email', suggested: 'contact_email', confidence: 'high', required: true },
        { detected: 'website', suggested: 'website_url', confidence: 'medium', required: false },
      ],
      validation: { valid: true, missing: [] },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with empty state', () => {
      const { loading, error, mappings, detectedColumns, validation } =
        useColumnMapping(mockUploadId);

      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
      expect(mappings.value).toEqual([]);
      expect(detectedColumns.value).toEqual([]);
      expect(validation.value).toEqual({ valid: false, missing: [] });
    });
  });

  describe('fetchColumnMappings', () => {
    it('should fetch and populate column mappings', async () => {
      vi.mocked($fetch).mockResolvedValueOnce(mockResponse);

      const { fetchColumnMappings, mappings, detectedColumns, validation } =
        useColumnMapping(mockUploadId);

      await fetchColumnMappings();

      expect($fetch).toHaveBeenCalledWith(`/api/imports/${mockUploadId}/columns`, {
        method: 'GET',
      });
      expect(mappings.value).toHaveLength(3);
      expect(detectedColumns.value).toEqual(['company', 'email', 'website']);
      expect(validation.value.valid).toBe(true);
    });

    it('should set loading state during fetch', async () => {
      vi.mocked($fetch).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockResponse), 100);
          }),
      );

      const { fetchColumnMappings, loading } = useColumnMapping(mockUploadId);

      const promise = fetchColumnMappings();
      expect(loading.value).toBe(true);

      await promise;
      expect(loading.value).toBe(false);
    });

    it('should handle fetch errors', async () => {
      const errorMessage = 'Network error';
      vi.mocked($fetch).mockRejectedValueOnce(new Error(errorMessage));

      const { fetchColumnMappings, error } = useColumnMapping(mockUploadId);

      await expect(fetchColumnMappings()).rejects.toThrow(errorMessage);
      expect(error.value).toBe(errorMessage);
    });
  });

  describe('updateMapping', () => {
    it('should update a single column mapping', async () => {
      vi.mocked($fetch).mockResolvedValueOnce(mockResponse);

      const { fetchColumnMappings, updateMapping, mappings } = useColumnMapping(mockUploadId);

      await fetchColumnMappings();

      updateMapping('company', 'company_siren');

      const updated = mappings.value.find((m) => m.detected === 'company');
      expect(updated?.suggested).toBe('company_siren');
    });

    it('should trigger revalidation after update', async () => {
      vi.mocked($fetch).mockResolvedValueOnce(mockResponse);

      const { fetchColumnMappings, updateMapping, validation } = useColumnMapping(mockUploadId);

      await fetchColumnMappings();

      // Clear a required mapping
      updateMapping('email', '');

      expect(validation.value.valid).toBe(false);
      expect(validation.value.missing).toContain('contact_email');
    });
  });

  describe('validateMappings', () => {
    it('should detect missing required fields', async () => {
      const invalidResponse = {
        ...mockResponse,
        data: {
          ...mockResponse.data,
          suggestedMappings: [
            { detected: 'company', suggested: '', confidence: 'low', required: true },
            { detected: 'email', suggested: '', confidence: 'low', required: true },
          ],
        },
      };

      vi.mocked($fetch).mockResolvedValueOnce(invalidResponse);

      const { fetchColumnMappings, validateMappings, validation } =
        useColumnMapping(mockUploadId);

      await fetchColumnMappings();
      validateMappings();

      expect(validation.value.valid).toBe(false);
      expect(validation.value.missing).toContain('company_name');
      expect(validation.value.missing).toContain('contact_email');
    });
  });

  describe('getMappingsObject', () => {
    it('should convert mappings array to object format', async () => {
      // Use fresh mock and instance
      const freshMockResponse = {
        success: true,
        data: {
          uploadId: 'fresh-id',
          detectedColumns: ['company', 'email', 'website'],
          suggestedMappings: [
            { detected: 'company', suggested: 'company_name', confidence: 'high', required: true },
            { detected: 'email', suggested: 'contact_email', confidence: 'high', required: true },
            { detected: 'website', suggested: 'website_url', confidence: 'medium', required: false },
          ],
          validation: { valid: true, missing: [] },
        },
      };
      
      vi.mocked($fetch).mockResolvedValueOnce(freshMockResponse);

      const { fetchColumnMappings, getMappingsObject } = useColumnMapping('fresh-id');

      await fetchColumnMappings();

      const obj = getMappingsObject();

      expect(obj).toEqual({
        company: 'company_name',
        email: 'contact_email',
        website: 'website_url',
      });
    });

    it('should exclude empty mappings', async () => {
      const responseWithEmpty = {
        ...mockResponse,
        data: {
          ...mockResponse.data,
          suggestedMappings: [
            { detected: 'company', suggested: 'company_name', confidence: 'high', required: true },
            { detected: 'unknown', suggested: '', confidence: 'low', required: false },
          ],
        },
      };

      vi.mocked($fetch).mockResolvedValueOnce(responseWithEmpty);

      const { fetchColumnMappings, getMappingsObject } = useColumnMapping(mockUploadId);

      await fetchColumnMappings();

      const obj = getMappingsObject();

      expect(obj).toEqual({
        company: 'company_name',
      });
      expect(obj).not.toHaveProperty('unknown');
    });
  });

  describe('submitMappings', () => {
    it('should submit mappings to backend', async () => {
      // Use fresh mock and instance
      const freshMockResponse = {
        success: true,
        data: {
          uploadId: 'submit-test-id',
          detectedColumns: ['company', 'email', 'website'],
          suggestedMappings: [
            { detected: 'company', suggested: 'company_name', confidence: 'high', required: true },
            { detected: 'email', suggested: 'contact_email', confidence: 'high', required: true },
            { detected: 'website', suggested: 'website_url', confidence: 'medium', required: false },
          ],
          validation: { valid: true, missing: [] },
        },
      };
      
      // Mock initial fetch
      vi.mocked($fetch).mockResolvedValueOnce(freshMockResponse);

      const { fetchColumnMappings, submitMappings } = useColumnMapping('submit-test-id');

      await fetchColumnMappings();
      
      // Mock submit response
      vi.mocked($fetch).mockResolvedValueOnce({ success: true });
      
      const result = await submitMappings();

      // Check only the submit call (second call)
      expect($fetch).toHaveBeenCalledTimes(2);
      expect($fetch).toHaveBeenNthCalledWith(2, `/api/imports/submit-test-id/map`, {
        method: 'POST',
        body: {
          columnMappings: {
            company: 'company_name',
            email: 'contact_email',
            website: 'website_url',
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('should handle submit errors', async () => {
      vi.mocked($fetch).mockResolvedValueOnce(mockResponse);
      vi.mocked($fetch).mockRejectedValueOnce(new Error('Server error'));

      const { fetchColumnMappings, submitMappings, error } = useColumnMapping(mockUploadId);

      await fetchColumnMappings();

      await expect(submitMappings()).rejects.toThrow('Server error');
      expect(error.value).toBe('Server error');
    });
  });
});
