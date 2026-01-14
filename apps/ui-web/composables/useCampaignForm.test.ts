import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock $fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

// Mock Vue reactivity
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue');
  return {
    ...actual,
    ref: (val: any) => ({ value: val }),
    computed: (fn: () => any) => ({ value: fn() }),
  };
});

import { useCampaignForm } from './useCampaignForm';
import type { CampaignFormData } from './useCampaignForm';

describe('useCampaignForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with empty form data when no initial data provided', () => {
      const { form } = useCampaignForm();

      expect(form.value.name).toBe('');
      expect(form.value.valueProp).toBe('');
    });

    it('should initialize with provided initial data', () => {
      const initialData: Partial<CampaignFormData> = {
        name: 'Test Campaign',
        valueProp: 'Test value proposition',
      };

      const { form } = useCampaignForm(initialData);

      expect(form.value.name).toBe('Test Campaign');
      expect(form.value.valueProp).toBe('Test value proposition');
    });

    it('should have no errors on initialization', () => {
      const { errors } = useCampaignForm();

      expect(errors.value.name).toBeUndefined();
      expect(errors.value.valueProp).toBeUndefined();
      expect(errors.value.form).toBeUndefined();
    });

    it('should not be submitting on initialization', () => {
      const { isSubmitting } = useCampaignForm();

      expect(isSubmitting.value).toBe(false);
    });
  });

  describe('validation - name field', () => {
    it('should return error when name is empty', () => {
      const { form, validateField, errors } = useCampaignForm();
      form.value.name = '';

      const result = validateField('name');

      expect(result).toBe(false);
      expect(errors.value.name).toBe('Le nom est requis');
    });

    it('should return error when name is only whitespace', () => {
      const { form, validateField, errors } = useCampaignForm();
      form.value.name = '   ';

      const result = validateField('name');

      expect(result).toBe(false);
      expect(errors.value.name).toBe('Le nom est requis');
    });

    it('should return error when name exceeds 100 characters', () => {
      const { form, validateField, errors } = useCampaignForm();
      form.value.name = 'a'.repeat(101);

      const result = validateField('name');

      expect(result).toBe(false);
      expect(errors.value.name).toBe('Le nom ne peut pas dépasser 100 caractères');
    });

    it('should pass validation for valid name', () => {
      const { form, validateField, errors } = useCampaignForm();
      form.value.name = 'Valid Campaign Name';

      const result = validateField('name');

      expect(result).toBe(true);
      expect(errors.value.name).toBeUndefined();
    });

    it('should pass validation for name at max length (100 chars)', () => {
      const { form, validateField, errors } = useCampaignForm();
      form.value.name = 'a'.repeat(100);

      const result = validateField('name');

      expect(result).toBe(true);
      expect(errors.value.name).toBeUndefined();
    });
  });

  describe('validation - valueProp field', () => {
    it('should pass validation when valueProp is empty (optional field)', () => {
      const { form, validateField, errors } = useCampaignForm();
      form.value.valueProp = '';

      const result = validateField('valueProp');

      expect(result).toBe(true);
      expect(errors.value.valueProp).toBeUndefined();
    });

    it('should return error when valueProp exceeds 150 characters', () => {
      const { form, validateField, errors } = useCampaignForm();
      form.value.valueProp = 'a'.repeat(151);

      const result = validateField('valueProp');

      expect(result).toBe(false);
      expect(errors.value.valueProp).toBe(
        'La proposition de valeur ne peut pas dépasser 150 caractères'
      );
    });

    it('should pass validation for valid valueProp', () => {
      const { form, validateField, errors } = useCampaignForm();
      form.value.valueProp = 'Valid value proposition';

      const result = validateField('valueProp');

      expect(result).toBe(true);
      expect(errors.value.valueProp).toBeUndefined();
    });

    it('should pass validation for valueProp at max length (150 chars)', () => {
      const { form, validateField, errors } = useCampaignForm();
      form.value.valueProp = 'a'.repeat(150);

      const result = validateField('valueProp');

      expect(result).toBe(true);
      expect(errors.value.valueProp).toBeUndefined();
    });
  });

  describe('validateForm', () => {
    it('should return true when all fields are valid', () => {
      const { form, validateForm } = useCampaignForm();
      form.value.name = 'Valid Name';
      form.value.valueProp = 'Valid value prop';

      const result = validateForm();

      expect(result).toBe(true);
    });

    it('should return false when name is invalid', () => {
      const { form, validateForm } = useCampaignForm();
      form.value.name = '';
      form.value.valueProp = 'Valid value prop';

      const result = validateForm();

      expect(result).toBe(false);
    });

    it('should return true when valueProp is empty (optional)', () => {
      const { form, validateForm } = useCampaignForm();
      form.value.name = 'Valid Name';
      form.value.valueProp = '';

      const result = validateForm();

      expect(result).toBe(true);
    });

    it('should return false when both name is empty', () => {
      const { form, validateForm } = useCampaignForm();
      form.value.name = '';
      form.value.valueProp = '';

      const result = validateForm();

      expect(result).toBe(false);
    });
  });

  describe('isValid computed', () => {
    it('should be true when form has valid data', () => {
      const { isValid } = useCampaignForm({
        name: 'Valid Name',
        valueProp: 'Valid prop',
      });

      // Access computed value
      expect(isValid.value).toBe(true);
    });

    it('should be false when name is empty', () => {
      const { isValid } = useCampaignForm({
        name: '',
        valueProp: 'Valid prop',
      });

      expect(isValid.value).toBe(false);
    });

    it('should be true when valueProp is empty (optional)', () => {
      const { isValid } = useCampaignForm({
        name: 'Valid Name',
        valueProp: '',
      });

      expect(isValid.value).toBe(true);
    });
  });

  describe('resetForm', () => {
    it('should reset form to initial empty state when no initial data', () => {
      const { form, errors, resetForm } = useCampaignForm();

      // Modify form
      form.value.name = 'Modified';
      form.value.valueProp = 'Modified';
      errors.value.name = 'Some error';

      resetForm();

      expect(form.value.name).toBe('');
      expect(form.value.valueProp).toBe('');
      expect(errors.value.name).toBeUndefined();
    });

    it('should reset form to initial data when provided', () => {
      const initialData = {
        name: 'Initial Name',
        valueProp: 'Initial Prop',
      };
      const { form, resetForm } = useCampaignForm(initialData);

      // Modify form
      form.value.name = 'Modified';
      form.value.valueProp = 'Modified';

      resetForm();

      expect(form.value.name).toBe('Initial Name');
      expect(form.value.valueProp).toBe('Initial Prop');
    });
  });

  describe('submitForm', () => {
    it('should throw error when validation fails', async () => {
      const { form, submitForm } = useCampaignForm();
      form.value.name = '';
      form.value.valueProp = '';

      await expect(submitForm()).rejects.toThrow('Validation failed');
    });

    it('should call API with trimmed form data when valid', async () => {
      const mockResponse = {
        id: 'campaign-123',
        name: 'Test Campaign',
        valueProp: 'Test prop',
        status: 'draft',
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const { form, submitForm } = useCampaignForm();
      form.value.name = '  Test Campaign  ';
      form.value.valueProp = '  Test prop  ';

      const result = await submitForm();

      expect(mockFetch).toHaveBeenCalledWith('/api/campaigns', {
        method: 'POST',
        body: {
          name: 'Test Campaign',
          valueProp: 'Test prop',
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should set form error for 400 response', async () => {
      const error = { statusCode: 400, data: { message: 'Invalid data' } };
      mockFetch.mockRejectedValueOnce(error);

      const { form, errors, submitForm } = useCampaignForm();
      form.value.name = 'Test';
      form.value.valueProp = 'Test';

      await expect(submitForm()).rejects.toEqual(error);
      expect(errors.value.form).toBe('Invalid data');
    });

    it('should set form error for 401 response', async () => {
      const error = { statusCode: 401 };
      mockFetch.mockRejectedValueOnce(error);

      const { form, errors, submitForm } = useCampaignForm();
      form.value.name = 'Test';
      form.value.valueProp = 'Test';

      await expect(submitForm()).rejects.toEqual(error);
      expect(errors.value.form).toBe('Session expirée. Veuillez vous reconnecter.');
    });

    it('should set form error for 403 response', async () => {
      const error = { statusCode: 403 };
      mockFetch.mockRejectedValueOnce(error);

      const { form, errors, submitForm } = useCampaignForm();
      form.value.name = 'Test';
      form.value.valueProp = 'Test';

      await expect(submitForm()).rejects.toEqual(error);
      expect(errors.value.form).toBe("Accès refusé. Vous n'avez pas les permissions nécessaires.");
    });

    it('should set form error for 500 response', async () => {
      const error = { statusCode: 500 };
      mockFetch.mockRejectedValueOnce(error);

      const { form, errors, submitForm } = useCampaignForm();
      form.value.name = 'Test';
      form.value.valueProp = 'Test';

      await expect(submitForm()).rejects.toEqual(error);
      expect(errors.value.form).toBe('Erreur serveur. Veuillez réessayer.');
    });

    it('should set generic form error for unknown errors', async () => {
      const error = { statusCode: 502, data: { message: 'Gateway error' } };
      mockFetch.mockRejectedValueOnce(error);

      const { form, errors, submitForm } = useCampaignForm();
      form.value.name = 'Test';
      form.value.valueProp = 'Test';

      await expect(submitForm()).rejects.toEqual(error);
      expect(errors.value.form).toBe('Gateway error');
    });

    it('should set isSubmitting to false after completion', async () => {
      mockFetch.mockResolvedValueOnce({ id: '123' });

      const { form, isSubmitting, submitForm } = useCampaignForm();
      form.value.name = 'Test';
      form.value.valueProp = 'Test';

      await submitForm();

      expect(isSubmitting.value).toBe(false);
    });

    it('should set isSubmitting to false after error', async () => {
      mockFetch.mockRejectedValueOnce({ statusCode: 500 });

      const { form, isSubmitting, submitForm } = useCampaignForm();
      form.value.name = 'Test';
      form.value.valueProp = 'Test';

      try {
        await submitForm();
      } catch {
        // Expected
      }

      expect(isSubmitting.value).toBe(false);
    });
  });

  describe('edit mode', () => {
    it('should call PATCH endpoint when mode is edit', async () => {
      const mockResponse = {
        id: 'campaign-123',
        name: 'Updated Campaign',
        valueProp: 'Updated prop',
        status: 'draft',
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const { form, submitForm } = useCampaignForm(
        { name: 'Original', valueProp: 'Original prop' },
        'edit',
        'campaign-123'
      );
      form.value.name = 'Updated Campaign';
      form.value.valueProp = 'Updated prop';

      const result = await submitForm();

      expect(mockFetch).toHaveBeenCalledWith('/api/campaigns/campaign-123', {
        method: 'PATCH',
        body: {
          name: 'Updated Campaign',
          valueProp: 'Updated prop',
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should call POST endpoint when mode is create (default)', async () => {
      const mockResponse = { id: 'new-123', name: 'New', valueProp: '', status: 'draft' };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const { form, submitForm } = useCampaignForm();
      form.value.name = 'New Campaign';
      form.value.valueProp = '';

      await submitForm();

      expect(mockFetch).toHaveBeenCalledWith('/api/campaigns', {
        method: 'POST',
        body: {
          name: 'New Campaign',
          valueProp: '',
        },
      });
    });

    it('should set 404 error message in edit mode', async () => {
      const error = { statusCode: 404 };
      mockFetch.mockRejectedValueOnce(error);

      const { form, errors, submitForm } = useCampaignForm(
        { name: 'Test', valueProp: '' },
        'edit',
        'missing-id'
      );
      form.value.name = 'Test';
      form.value.valueProp = '';

      await expect(submitForm()).rejects.toEqual(error);
      expect(errors.value.form).toBe('Campagne introuvable');
    });

    it('should initialize form with initial data in edit mode', () => {
      const initialData = {
        name: 'Existing Campaign',
        valueProp: 'Existing value prop',
      };

      const { form } = useCampaignForm(initialData, 'edit', 'campaign-123');

      expect(form.value.name).toBe('Existing Campaign');
      expect(form.value.valueProp).toBe('Existing value prop');
    });

    it('should handle empty valueProp in PATCH by sending null', async () => {
      const mockResponse = { id: 'campaign-123', name: 'Test', valueProp: null, status: 'draft' };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const { form, submitForm } = useCampaignForm(
        { name: 'Test', valueProp: '' },
        'edit',
        'campaign-123'
      );
      form.value.name = 'Test';
      form.value.valueProp = '';

      await submitForm();

      expect(mockFetch).toHaveBeenCalledWith('/api/campaigns/campaign-123', {
        method: 'PATCH',
        body: {
          name: 'Test',
          valueProp: null,
        },
      });
    });
  });
});
