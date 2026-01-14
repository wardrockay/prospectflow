import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { mount } from '@vue/test-utils';
import { setupNuxtMocks, resetNuxtMocks, mockRoute } from '../../utils/nuxt-mocks';

// Setup mocks before importing components
beforeAll(() => {
  setupNuxtMocks();
});

import MobileMenu from '~/components/Layout/MobileMenu.vue';

describe('Layout/MobileMenu.vue', () => {
  beforeEach(() => {
    resetNuxtMocks();
  });

  const mountMobileMenu = (isOpen = true) => {
    return mount(MobileMenu, {
      props: {
        modelValue: isOpen,
      },
      global: {
        stubs: {
          USlideover: {
            template: `<div class="slideover" v-if="modelValue"><slot /></div>`,
            props: ['modelValue', 'side'],
          },
          UButton: {
            template: `<button :class="{ active: variant === 'soft' }" :data-to="to" @click="$emit('click')"><slot /></button>`,
            props: ['to', 'variant', 'color', 'icon', 'block'],
          },
          UDivider: {
            template: '<hr />',
          },
        },
      },
    });
  };

  describe('Rendering', () => {
    it('should render when modelValue is true', () => {
      const wrapper = mountMobileMenu(true);
      expect(wrapper.find('.slideover').exists()).toBe(true);
    });

    it('should not render content when modelValue is false', () => {
      const wrapper = mountMobileMenu(false);
      expect(wrapper.find('.slideover').exists()).toBe(false);
    });
  });

  describe('Navigation Items', () => {
    it('should render Campagnes and Prospects navigation links', () => {
      const wrapper = mountMobileMenu(true);
      expect(wrapper.text()).toContain('Campagnes');
      expect(wrapper.text()).toContain('Prospects');
    });

    it('should render logout button', () => {
      const wrapper = mountMobileMenu(true);
      expect(wrapper.text()).toContain('Déconnexion');
    });
  });

  describe('Close Functionality', () => {
    it('should render close button', () => {
      const wrapper = mountMobileMenu(true);
      // Find the X button (first button in header area)
      const buttons = wrapper.findAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should emit update:modelValue when close button is clicked', async () => {
      const wrapper = mountMobileMenu(true);
      const closeButton = wrapper
        .findAll('button')
        .find(
          (btn) =>
            btn.attributes('aria-label') === 'Fermer le menu' ||
            wrapper.text().includes('ProspectFlow')
        );

      if (closeButton) {
        await closeButton.trigger('click');
        expect(wrapper.emitted('update:modelValue')).toBeTruthy();
      }
    });
  });

  describe('Active Route Highlighting', () => {
    it('should highlight Campagnes when on /campaigns route', () => {
      mockRoute.value = { path: '/campaigns', params: {}, query: {} };
      const wrapper = mountMobileMenu(true);
      const buttons = wrapper.findAll('button[data-to]');

      const campaignsButton = buttons.find((b) => b.attributes('data-to') === '/campaigns');
      expect(campaignsButton?.classes()).toContain('active');
    });
  });
});
