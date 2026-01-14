import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { mount } from '@vue/test-utils';
import { setupNuxtMocks, resetNuxtMocks } from '../../utils/nuxt-mocks';

// Setup mocks before importing components
beforeAll(() => {
  setupNuxtMocks();
});

import Header from '~/components/Layout/Header.vue';

describe('Layout/Header.vue', () => {
  beforeEach(() => {
    resetNuxtMocks();
  });

  const mountHeader = () => {
    return mount(Header, {
      props: {
        isMobileMenuOpen: false,
      },
      global: {
        stubs: {
          UContainer: {
            template: '<div class="container"><slot /></div>',
          },
          UButton: {
            template: `<button @click="$emit('click')" :class="$attrs.class" :aria-label="ariaLabel"><slot /></button>`,
            props: ['icon', 'variant', 'class', 'ariaLabel'],
          },
          NuxtLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to'],
          },
          LayoutNavigation: {
            template: '<nav class="navigation-stub">Navigation</nav>',
          },
          LayoutUserMenu: {
            template: '<div class="user-menu-stub">UserMenu</div>',
          },
        },
      },
    });
  };

  describe('Logo', () => {
    it('should display ProspectFlow logo', () => {
      const wrapper = mountHeader();
      expect(wrapper.text()).toContain('ProspectFlow');
    });

    it('should have logo link to home page', () => {
      const wrapper = mountHeader();
      const logoLink = wrapper.find('a[href="/"]');
      expect(logoLink.exists()).toBe(true);
    });
  });

  describe('Sticky Header', () => {
    it('should have sticky positioning class', () => {
      const wrapper = mountHeader();
      const header = wrapper.find('header');
      expect(header.classes()).toContain('sticky');
      expect(header.classes()).toContain('top-0');
    });

    it('should have shadow for visual separation', () => {
      const wrapper = mountHeader();
      const header = wrapper.find('header');
      expect(header.classes()).toContain('shadow-sm');
    });

    it('should have z-index for layering', () => {
      const wrapper = mountHeader();
      const header = wrapper.find('header');
      expect(header.classes()).toContain('z-50');
    });
  });

  describe('Desktop Navigation', () => {
    it('should include Navigation component', () => {
      const wrapper = mountHeader();
      expect(wrapper.find('.navigation-stub').exists()).toBe(true);
    });

    it('should include UserMenu component', () => {
      const wrapper = mountHeader();
      expect(wrapper.find('.user-menu-stub').exists()).toBe(true);
    });
  });

  describe('Mobile Hamburger', () => {
    it('should have hamburger button for mobile', () => {
      const wrapper = mountHeader();
      const buttons = wrapper.findAll('button');
      // At least one button should exist (hamburger)
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should emit toggle-mobile-menu when hamburger is clicked', async () => {
      const wrapper = mountHeader();
      const buttons = wrapper.findAll('button');

      // Click the hamburger button
      if (buttons.length > 0) {
        await buttons[0].trigger('click');
        expect(wrapper.emitted('toggle-mobile-menu')).toBeTruthy();
      }
    });

    it('should have hamburger button for mobile responsive behavior', () => {
      const wrapper = mountHeader();
      // Look for the button with bars-3 icon (hamburger) - the one with aria-label for mobile
      const hamburgerButton = wrapper.find('button[aria-label="Ouvrir le menu"]');
      expect(hamburgerButton.exists()).toBe(true);
    });
  });
});
