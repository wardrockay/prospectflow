import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { mount } from '@vue/test-utils';
import { setupNuxtMocks, resetNuxtMocks } from '@tests/utils/nuxt-mocks';

// Setup mocks before importing components
beforeAll(() => {
  setupNuxtMocks();
});

import Footer from '~/components/Layout/Footer.vue';

describe('Layout/Footer.vue', () => {
  beforeEach(() => {
    resetNuxtMocks();
  });

  const mountFooter = () => {
    return mount(Footer, {
      global: {
        stubs: {
          UContainer: {
            template: '<div class="container"><slot /></div>',
          },
        },
      },
    });
  };

  describe('Copyright', () => {
    it('should display ProspectFlow copyright text', () => {
      const wrapper = mountFooter();
      expect(wrapper.text()).toContain('ProspectFlow');
      expect(wrapper.text()).toContain('Tous droits réservés');
    });

    it('should display current year dynamically', () => {
      const wrapper = mountFooter();
      const currentYear = new Date().getFullYear();
      expect(wrapper.text()).toContain(String(currentYear));
    });
  });

  describe('Styling', () => {
    it('should have footer element with border-t class', () => {
      const wrapper = mountFooter();
      const footer = wrapper.find('footer');
      expect(footer.exists()).toBe(true);
      expect(footer.classes()).toContain('border-t');
    });

    it('should have mt-auto class for sticky footer behavior', () => {
      const wrapper = mountFooter();
      const footer = wrapper.find('footer');
      expect(footer.classes()).toContain('mt-auto');
    });
  });
});
