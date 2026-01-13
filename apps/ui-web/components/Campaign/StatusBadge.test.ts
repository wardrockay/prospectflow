import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import StatusBadge from './StatusBadge.vue';

describe('CampaignStatusBadge', () => {
  it('should render draft badge with gray color', () => {
    const wrapper = mount(StatusBadge, {
      props: {
        status: 'draft',
      },
    });

    expect(wrapper.text()).toContain('Brouillon');
    expect(wrapper.html()).toContain('gray');
  });

  it('should render active badge with green color', () => {
    const wrapper = mount(StatusBadge, {
      props: {
        status: 'active',
      },
    });

    expect(wrapper.text()).toContain('Actif');
    expect(wrapper.html()).toContain('green');
  });

  it('should render paused badge with yellow color', () => {
    const wrapper = mount(StatusBadge, {
      props: {
        status: 'paused',
      },
    });

    expect(wrapper.text()).toContain('En pause');
    expect(wrapper.html()).toContain('yellow');
  });

  it('should render completed badge with blue color', () => {
    const wrapper = mount(StatusBadge, {
      props: {
        status: 'completed',
      },
    });

    expect(wrapper.text()).toContain('Terminé');
    expect(wrapper.html()).toContain('blue');
  });
});
