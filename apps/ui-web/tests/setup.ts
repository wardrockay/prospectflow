import { vi } from 'vitest';
import { ref as vueRef, computed as vueComputed } from 'vue';

// Ensure this is treated as a module
export {};

// Note: Type declarations for Nuxt auto-imports are already provided by .nuxt/types
// We only need to assign the mock implementations to globalThis

// Mock Nuxt auto-imports globally for all tests
globalThis.useRuntimeConfig = vi.fn(() => ({
  public: {
    cognitoHostedUI: 'https://test.auth.cognito.com',
    cognitoClientId: 'test-client-id',
    cognitoRedirectUri: 'http://localhost:4000/auth/callback',
    logoutUri: 'http://localhost:4000/login',
    apiBase: 'http://localhost:3001',
  },
})) as typeof useRuntimeConfig;

globalThis.navigateTo = vi.fn() as typeof navigateTo;
globalThis.$fetch = vi.fn() as typeof $fetch;

globalThis.useFetch = vi.fn(() => ({
  data: vueRef(null),
  pending: vueRef(false),
  error: vueRef(null),
  refresh: vi.fn(),
})) as typeof useFetch;

globalThis.useCookie = vi.fn((name: string) => ({
  value: name === 'token_expires_at' ? String(Date.now() + 3600000) : null,
})) as typeof useCookie;

globalThis.defineNuxtRouteMiddleware = ((fn: unknown) => fn) as typeof defineNuxtRouteMiddleware;

// Mock Vue composables
globalThis.ref = vueRef;
globalThis.computed = vueComputed;
