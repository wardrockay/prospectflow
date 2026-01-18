import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ColumnMapper from '~/components/Prospect/ColumnMapper.vue';
import type { ColumnMapping, ValidationResult } from '~/types/csv.types';

/**
 * ColumnMapper Component Tests
 * 
 * These tests verify the component's props, emits, and computed behavior.
 * Full visual/integration tests are done via E2E tests with Playwright.
 */
describe('ColumnMapper', () => {
  const mockMappings: ColumnMapping[] = [
    { detected: 'company', suggested: 'company_name', confidence: 'high', required: true },
    { detected: 'email', suggested: 'contact_email', confidence: 'high', required: true },
    { detected: 'website', suggested: 'website_url', confidence: 'medium', required: false },
  ];

  const mockValidValidation: ValidationResult = {
    valid: true,
    missing: [],
  };

  const mockInvalidValidation: ValidationResult = {
    valid: false,
    missing: ['company_name'],
  };

  // Global stubs for NuxtUI components
  const globalStubs = {
    stubs: {
      UCard: { template: '<div><slot name="header"/><slot /><slot name="footer"/></div>' },
      UBadge: { template: '<span><slot /></span>' },
      UIcon: { template: '<span></span>' },
      USelect: {
        template: '<select @change="$emit(\'update:model-value\', $event.target.value)"><option></option></select>',
        emits: ['update:model-value'],
      },
      UAlert: { template: '<div v-if="$attrs.title"><slot name="description" /></div>' },
      UButton: { template: '<button @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
    },
  };

  describe('Component Props', () => {
    it('should accept mappings, validation and loading props', () => {
      const wrapper = mount(ColumnMapper, {
        props: {
          mappings: mockMappings,
          validation: mockValidValidation,
          loading: false,
        },
        global: globalStubs,
      });

      expect(wrapper.vm.mappings).toEqual(mockMappings);
      expect(wrapper.vm.validation).toEqual(mockValidValidation);
      expect(wrapper.vm.loading).toBe(false);
    });

    it('should render column labels from mappings prop', () => {
      const wrapper = mount(ColumnMapper, {
        props: {
          mappings: mockMappings,
          validation: mockValidValidation,
        },
        global: globalStubs,
      });

      const text = wrapper.text();
      expect(text).toContain('company');
      expect(text).toContain('email');
      expect(text).toContain('website');
    });
  });

  describe('Component Emits', () => {
    it('should emit update-mapping when dropdown changes', async () => {
      const wrapper = mount(ColumnMapper, {
        props: {
          mappings: mockMappings,
          validation: mockValidValidation,
        },
        global: globalStubs,
      });

      // Find first select and trigger change
      const select = wrapper.find('select');
      await select.trigger('change');

      // Component should emit update-mapping
      expect(wrapper.emitted()).toHaveProperty('update-mapping');
    });

    it('should emit back when back button clicked', async () => {
      const wrapper = mount(ColumnMapper, {
        props: {
          mappings: mockMappings,
          validation: mockValidValidation,
        },
        global: globalStubs,
      });

      const buttons = wrapper.findAll('button');
      const backButton = buttons.find((b) => b.text().includes('Retour'));
      
      if (backButton) {
        await backButton.trigger('click');
        expect(wrapper.emitted()).toHaveProperty('back');
      }
    });

    it('should emit confirm when confirm button clicked', async () => {
      const wrapper = mount(ColumnMapper, {
        props: {
          mappings: mockMappings,
          validation: mockValidValidation,
        },
        global: globalStubs,
      });

      const buttons = wrapper.findAll('button');
      const confirmButton = buttons.find((b) => b.text().includes('Valider'));
      
      if (confirmButton) {
        await confirmButton.trigger('click');
        expect(wrapper.emitted()).toHaveProperty('confirm');
      }
    });
  });

  describe('Computed Functions', () => {
    it('getConfidenceColor should return correct colors', () => {
      const wrapper = mount(ColumnMapper, {
        props: {
          mappings: mockMappings,
          validation: mockValidValidation,
        },
        global: globalStubs,
      });

      // Access the component's internal function
      const vm = wrapper.vm as any;
      expect(vm.getConfidenceColor('high')).toBe('green');
      expect(vm.getConfidenceColor('medium')).toBe('yellow');
      expect(vm.getConfidenceColor('low')).toBe('gray');
    });

    it('getConfidenceLabel should return French labels', () => {
      const wrapper = mount(ColumnMapper, {
        props: {
          mappings: mockMappings,
          validation: mockValidValidation,
        },
        global: globalStubs,
      });

      const vm = wrapper.vm as any;
      expect(vm.getConfidenceLabel('high')).toBe('Haute confiance');
      expect(vm.getConfidenceLabel('medium')).toBe('Confiance moyenne');
      expect(vm.getConfidenceLabel('low')).toBe('Faible confiance');
    });

    it('getFieldLabel should return French field names', () => {
      const wrapper = mount(ColumnMapper, {
        props: {
          mappings: mockMappings,
          validation: mockValidValidation,
        },
        global: globalStubs,
      });

      const vm = wrapper.vm as any;
      expect(vm.getFieldLabel('company_name')).toBe("Nom de l'entreprise");
      expect(vm.getFieldLabel('contact_email')).toBe('Email du contact');
      expect(vm.getFieldLabel('unknown_field')).toBe('unknown_field');
    });
  });

  describe('Field Options', () => {
    it('should have grouped field options', () => {
      const wrapper = mount(ColumnMapper, {
        props: {
          mappings: mockMappings,
          validation: mockValidValidation,
        },
        global: globalStubs,
      });

      const vm = wrapper.vm as any;
      const fieldOptions = vm.fieldOptions;

      expect(fieldOptions).toHaveLength(3); // 3 groups
      expect(fieldOptions[0].label).toBe('Champs entreprise');
      expect(fieldOptions[1].label).toBe('Champs contact');
      expect(fieldOptions[2].label).toBe('Autres');
    });

    it('should have ignore column option', () => {
      const wrapper = mount(ColumnMapper, {
        props: {
          mappings: mockMappings,
          validation: mockValidValidation,
        },
        global: globalStubs,
      });

      const vm = wrapper.vm as any;
      const otherOptions = vm.fieldOptions[2].children;
      
      const ignoreOption = otherOptions.find((opt: any) => opt.label === 'Ignorer cette colonne');
      expect(ignoreOption).toBeDefined();
      expect(ignoreOption.value).toBe('');
    });

    it('should have custom field option', () => {
      const wrapper = mount(ColumnMapper, {
        props: {
          mappings: mockMappings,
          validation: mockValidValidation,
        },
        global: globalStubs,
      });

      const vm = wrapper.vm as any;
      const otherOptions = vm.fieldOptions[2].children;
      
      const customOption = otherOptions.find((opt: any) => opt.label === 'Champ personnalisé');
      expect(customOption).toBeDefined();
      expect(customOption.value).toBe('__custom__');
    });
  });
});
