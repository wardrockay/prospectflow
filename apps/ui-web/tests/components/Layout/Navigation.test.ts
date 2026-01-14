import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { mount } from '@vue/test-utils';
import { setupNuxtMocks, resetNuxtMocks, mockRoute } from '../../utils/nuxt-mocks';

// Setup mocks before importing components
beforeAll(() => {
  setupNuxtMocks();
});

// Import component after mocks are setup
import Navigation from '~/components/Layout/Navigation.vue';

describe('Layout/Navigation.vue', () => {
  beforeEach(() => {
    resetNuxtMocks();
  });

  const mountNavigation = () => {
    return mount(Navigation, {
      global: {
        stubs: {
          UButton: {
            template: `<button :class="{ active: variant === 'soft' }" :data-to="to"><slot /></button>`,
            props: ['to', 'variant', 'color', 'icon'],
          },
        },
      },
    });
  };

  describe('Navigation Items', () => {
    it('should render Campagnes and Prospects navigation links', () => {
      const wrapper = mountNavigation();

      expect(wrapper.text()).toContain('Campagnes');
      expect(wrapper.text()).toContain('Prospects');
    });

    it('should have correct links for navigation items', () => {
      const wrapper = mountNavigation();
      const buttons = wrapper.findAll('button');

      expect(buttons[0].attributes('data-to')).toBe('/campaigns');
      expect(buttons[1].attributes('data-to')).toBe('/prospects');
    });
  });

  describe('Active Route Detection', () => {
    it('should highlight Campagnes when on /campaigns route', () => {
      mockRoute.value = { path: '/campaigns', params: {}, query: {} };
      const wrapper = mountNavigation();
      const buttons = wrapper.findAll('button');

      expect(buttons[0].classes()).toContain('active');
      expect(buttons[1].classes()).not.toContain('active');
    });

    it('should highlight Prospects when on /prospects route', () => {
      mockRoute.value = { path: '/prospects', params: {}, query: {} };
      const wrapper = mountNavigation();
      const buttons = wrapper.findAll('button');

      expect(buttons[0].classes()).not.toContain('active');
      expect(buttons[1].classes()).toContain('active');
    });

    it('should highlight parent route for nested routes like /campaigns/123', () => {
      mockRoute.value = { path: '/campaigns/123', params: {}, query: {} };
      const wrapper = mountNavigation();
      const buttons = wrapper.findAll('button');

      expect(buttons[0].classes()).toContain('active');
    });

    it('should not highlight any link when on home route', () => {
      mockRoute.value = { path: '/', params: {}, query: {} };
      const wrapper = mountNavigation();
      const buttons = wrapper.findAll('button');

      expect(buttons[0].classes()).not.toContain('active');
      expect(buttons[1].classes()).not.toContain('active');
    });
  });
});
