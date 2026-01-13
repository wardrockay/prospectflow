import { vi } from 'vitest';
import { ref, computed, watch } from 'vue';

// Mock Nuxt runtime config
export const mockRuntimeConfig = {
  public: {
    cognitoHostedUI: 'https://test.auth.cognito.com',
    cognitoClientId: 'test-client-id',
    cognitoRedirectUri: 'http://localhost:4000/auth/callback',
    logoutUri: 'http://localhost:4000/login',
  },
};

// Mock navigateTo function
export const mockNavigateTo = vi.fn();

// Mock $fetch function
export const mockFetch = vi.fn();

// Mock route
export const mockRoute = ref({
  path: '/',
  params: {},
  query: {},
});

// Mock cookie values
export const mockCookieValues: Record<string, string | null> = {
  token_expires_at: String(Date.now() + 3600000),
};

// Mock logout function
export const mockLogout = vi.fn();

// Mock useAuth composable
export const mockUseAuth = () => ({
  logout: mockLogout,
  login: vi.fn(),
  isAuthenticated: computed(() => true),
  isTokenExpired: vi.fn(() => false),
});

// Setup global mocks for Nuxt auto-imports
export function setupNuxtMocks() {
  // @ts-expect-error - global mock
  globalThis.useRuntimeConfig = () => mockRuntimeConfig;

  // @ts-expect-error - global mock
  globalThis.navigateTo = mockNavigateTo;

  // @ts-expect-error - global mock
  globalThis.$fetch = mockFetch;

  // @ts-expect-error - global mock
  globalThis.useRoute = () => mockRoute.value;

  // @ts-expect-error - global mock
  globalThis.useCookie = (name: string) => ({
    value: mockCookieValues[name] ?? null,
  });

  // @ts-expect-error - global mock
  globalThis.ref = ref;

  // @ts-expect-error - global mock
  globalThis.computed = computed;

  // @ts-expect-error - global mock
  globalThis.watch = watch;

  // @ts-expect-error - global mock
  globalThis.definePageMeta = vi.fn();

  // @ts-expect-error - global mock for useAuth composable
  globalThis.useAuth = mockUseAuth;
}

// Reset all mocks
export function resetNuxtMocks() {
  mockNavigateTo.mockClear();
  mockFetch.mockClear();
  mockLogout.mockClear();
  mockRoute.value = { path: '/', params: {}, query: {} };
  mockCookieValues.token_expires_at = String(Date.now() + 3600000);
}
