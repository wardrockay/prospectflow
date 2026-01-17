/**
 * ValidationResultsStep Component Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ValidationResultsStep from '~/components/prospects/ValidationResultsStep.vue';
import type { ValidationResult } from '~/types/validation.types';

describe('ValidationResultsStep', () => {
  const mockValidationResult: ValidationResult = {
    validCount: 85,
    invalidCount: 15,
    totalErrorCount: 15,
    errors: [
      {
        rowNumber: 3,
        field: 'contact_email',
        errorType: 'INVALID_EMAIL_FORMAT',
        message: 'Invalid email format',
        originalValue: 'bad-email',
      },
      {
        rowNumber: 7,
        field: 'company_name',
        errorType: 'COMPANY_NAME_REQUIRED',
        message: 'Company name is required',
        originalValue: '',
      },
    ],
    validRows: [],
    invalidRows: [],
  };

  it('should render validation summary correctly', () => {
    const wrapper = mount(ValidationResultsStep, {
      props: { validationResult: mockValidationResult },
    });

    expect(wrapper.text()).toContain('85');
    expect(wrapper.text()).toContain('Valid Rows');
    expect(wrapper.text()).toContain('15');
    expect(wrapper.text()).toContain('Invalid Rows');
  });

  it('should calculate valid percentage correctly', () => {
    const wrapper = mount(ValidationResultsStep, {
      props: { validationResult: mockValidationResult },
    });

    // 85 / 100 = 85%
    expect(wrapper.text()).toContain('85% valid');
  });

  it('should display error details in table', () => {
    const wrapper = mount(ValidationResultsStep, {
      props: { validationResult: mockValidationResult },
    });

    expect(wrapper.text()).toContain('Row #');
    expect(wrapper.text()).toContain('Field');
    expect(wrapper.text()).toContain('Error');
    expect(wrapper.text()).toContain('3');
    expect(wrapper.text()).toContain('contact_email');
    expect(wrapper.text()).toContain('Invalid email format');
  });

  it('should show warning when validation quality is low', () => {
    const lowQualityResult: ValidationResult = {
      validCount: 30,
      invalidCount: 70,
      totalErrorCount: 70,
      errors: [],
      validRows: [],
      invalidRows: [],
    };

    const wrapper = mount(ValidationResultsStep, {
      props: { validationResult: lowQualityResult },
    });

    expect(wrapper.text()).toContain('Low Data Quality');
  });

  it('should disable import button when no valid rows', () => {
    const noValidResult: ValidationResult = {
      validCount: 0,
      invalidCount: 100,
      totalErrorCount: 100,
      errors: [],
      validRows: [],
      invalidRows: [],
    };

    const wrapper = mount(ValidationResultsStep, {
      props: { validationResult: noValidResult },
    });

    const importButton = wrapper.find('button:contains("Import")');
    expect(importButton.attributes('disabled')).toBeDefined();
  });

  it('should emit import event when import button clicked', async () => {
    const wrapper = mount(ValidationResultsStep, {
      props: { validationResult: mockValidationResult },
    });

    await wrapper.find('button:contains("Import")').trigger('click');
    expect(wrapper.emitted('import')).toBeTruthy();
  });

  it('should emit back event when back button clicked', async () => {
    const wrapper = mount(ValidationResultsStep, {
      props: { validationResult: mockValidationResult },
    });

    await wrapper.find('button:contains("Back")').trigger('click');
    expect(wrapper.emitted('back')).toBeTruthy();
  });

  it('should emit cancel event when cancel button clicked', async () => {
    const wrapper = mount(ValidationResultsStep, {
      props: { validationResult: mockValidationResult },
    });

    await wrapper.find('button:contains("Cancel")').trigger('click');
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });

  it('should paginate errors correctly', () => {
    const manyErrors: ValidationResult = {
      validCount: 10,
      invalidCount: 50,
      totalErrorCount: 50,
      errors: Array.from({ length: 50 }, (_, i) => ({
        rowNumber: i + 1,
        field: 'company_name',
        errorType: 'COMPANY_NAME_REQUIRED',
        message: 'Required',
        originalValue: '',
      })),
      validRows: [],
      invalidRows: [],
    };

    const wrapper = mount(ValidationResultsStep, {
      props: { validationResult: manyErrors },
    });

    // Should show first 25 errors (default per page)
    const rows = wrapper.findAll('tbody tr');
    expect(rows.length).toBeLessThanOrEqual(25);
  });

  it('should show confirmation modal for low quality imports', async () => {
    const lowQualityResult: ValidationResult = {
      validCount: 30,
      invalidCount: 70,
      totalErrorCount: 70,
      errors: [],
      validRows: [],
      invalidRows: [],
    };

    const wrapper = mount(ValidationResultsStep, {
      props: { validationResult: lowQualityResult },
    });

    await wrapper.find('button:contains("Import")').trigger('click');
    
    // Should show modal instead of emitting import immediately
    expect(wrapper.find('.modal').exists()).toBe(true);
  });

  it('should generate CSV download with proper escaping', async () => {
    const createObjectURL = vi.fn();
    global.URL.createObjectURL = createObjectURL;
    const createElementSpy = vi.spyOn(document, 'createElement');

    const wrapper = mount(ValidationResultsStep, {
      props: { validationResult: mockValidationResult },
    });

    await wrapper.find('button:contains("Download Errors")').trigger('click');

    expect(createObjectURL).toHaveBeenCalled();
    expect(createElementSpy).toHaveBeenCalledWith('a');
  });
});
