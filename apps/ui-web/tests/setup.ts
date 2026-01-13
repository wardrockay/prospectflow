import { vi, type Mock } from 'vitest';
import { ref, computed, type Ref, type ComputedRef } from 'vue';

// Type declarations for Nuxt auto-imports on globalThis
declare global {
  // eslint-disable-next-line no-var
  var useRuntimeConfig: Mock;
  // eslint-disable-next-line no-var
  var navigateTo: Mock;
  // eslint-disable-next-line no-var
  var $fetch: Mock;
  // eslint-disable-next-line no-var
  var useFetch: Mock;
  // eslint-disable-next-line no-var
  var useCookie: Mock;
  // eslint-disable-next-line no-var
  var defineNuxtRouteMiddleware: (fn: unknown) => unknown;
  // eslint-disable-next-line no-var
  var ref: (typeof import('vue'))['ref'];
  // eslint-disable-next-line no-var
  var computed: (typeof import('vue'))['computed'];
}

// Mock Nuxt auto-imports globally for all tests
globalThis.useRuntimeConfig = vi.fn(() => ({
  public: {
    cognitoHostedUI: 'https://test.auth.cognito.com',
    cognitoClientId: 'test-client-id',
    cognitoRedirectUri: 'http://localhost:4000/auth/callback',
    logoutUri: 'http://localhost:4000/login',
    apiBase: 'http://localhost:3001',
  },
}));

globalThis.navigateTo = vi.fn();
globalThis.$fetch = vi.fn();

globalThis.useFetch = vi.fn(() => ({
  data: ref(null),
  pending: ref(false),
  error: ref(null),
  refresh: vi.fn(),
}));

globalThis.useCookie = vi.fn((name: string) => ({
  value: name === 'token_expires_at' ? String(Date.now() + 3600000) : null,
}));

globalThis.defineNuxtRouteMiddleware = (fn: unknown) => fn;

// Mock Vue composables
globalThis.ref = ref;
globalThis.computed = computed;
