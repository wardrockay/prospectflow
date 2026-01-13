import { vi } from 'vitest';
import { ref, computed } from 'vue';

// Mock Nuxt auto-imports globally for all tests
globalThis.useRuntimeConfig = vi.fn(() => ({
  public: {
    cognitoHostedUI: 'https://test.auth.cognito.com',
    cognitoClientId: 'test-client-id',
    cognitoRedirectUri: 'http://localhost:4000/auth/callback',
    logoutUri: 'http://localhost:4000/login',
  },
}));

globalThis.navigateTo = vi.fn();
globalThis.$fetch = vi.fn();

globalThis.useCookie = vi.fn((name: string) => ({
  value: name === 'token_expires_at' ? String(Date.now() + 3600000) : null,
}));

globalThis.defineNuxtRouteMiddleware = (fn: any) => fn;

// Mock Vue composables
globalThis.ref = ref;
globalThis.computed = computed;
