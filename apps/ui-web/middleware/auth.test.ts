import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RouteLocationNormalized } from 'vue-router';

// Mock Nuxt composables
const mockNavigateTo = vi.fn();
const mockIsAuthenticated = { value: true };
const mockIsTokenExpired = vi.fn(() => false);
const mockIsTokenExpiringSoon = vi.fn(() => false);
const mockRefreshToken = vi.fn(async () => true);

// Mock useAuth as global (Nuxt auto-import)
const mockUseAuth = vi.fn(() => ({
  isAuthenticated: mockIsAuthenticated,
  isTokenExpired: mockIsTokenExpired,
  isTokenExpiringSoon: mockIsTokenExpiringSoon,
  refreshToken: mockRefreshToken,
}));

// Set up global mocks before importing the middleware
vi.stubGlobal('navigateTo', mockNavigateTo);
vi.stubGlobal('useAuth', mockUseAuth);
vi.stubGlobal('defineNuxtRouteMiddleware', (fn: (to: RouteLocationNormalized) => unknown) => fn);

// Import after mocking
import authMiddleware from './auth';

// Type the middleware function
const middleware = authMiddleware as (to: RouteLocationNormalized) => unknown;

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.value = true;
    mockIsTokenExpired.mockReturnValue(false);
    mockIsTokenExpiringSoon.mockReturnValue(false);
    mockRefreshToken.mockResolvedValue(true);
  });

  describe('Protected routes', () => {
    it('should allow access when authenticated', async () => {
      const result = await middleware({ path: '/dashboard' } as RouteLocationNormalized);
      expect(result).toBeUndefined();
      expect(mockNavigateTo).not.toHaveBeenCalled();
    });

    it('should redirect to login when not authenticated', async () => {
      mockIsAuthenticated.value = false;

      await middleware({ path: '/dashboard' } as RouteLocationNormalized);

      expect(mockNavigateTo).toHaveBeenCalledWith('/login');
    });

    it('should try to refresh token when expired, redirect if refresh fails', async () => {
      mockIsTokenExpired.mockReturnValue(true);
      mockRefreshToken.mockResolvedValue(false);

      await middleware({ path: '/dashboard' } as RouteLocationNormalized);

      expect(mockRefreshToken).toHaveBeenCalled();
      expect(mockNavigateTo).toHaveBeenCalledWith({
        path: '/login',
        query: { expired: 'true' },
      });
    });

    it('should allow access if token refresh succeeds', async () => {
      mockIsTokenExpired.mockReturnValue(true);
      mockRefreshToken.mockResolvedValue(true);

      const result = await middleware({ path: '/dashboard' } as RouteLocationNormalized);

      expect(mockRefreshToken).toHaveBeenCalled();
      expect(result).toBeUndefined();
      expect(mockNavigateTo).not.toHaveBeenCalled();
    });

    it('should proactively refresh token when expiring soon', async () => {
      mockIsTokenExpiringSoon.mockReturnValue(true);

      await middleware({ path: '/dashboard' } as RouteLocationNormalized);

      expect(mockRefreshToken).toHaveBeenCalled();
    });
  });

  describe('Public routes', () => {
    it('should allow access to login page when not authenticated', async () => {
      mockIsAuthenticated.value = false;

      const result = await middleware({ path: '/login' } as RouteLocationNormalized);

      expect(result).toBeUndefined();
      expect(mockNavigateTo).not.toHaveBeenCalled();
    });

    it('should redirect to home when accessing login while authenticated', async () => {
      mockIsAuthenticated.value = true;

      await middleware({ path: '/login' } as RouteLocationNormalized);

      expect(mockNavigateTo).toHaveBeenCalledWith('/');
    });

    it('should allow access to callback page', async () => {
      mockIsAuthenticated.value = false;

      const result = await middleware({ path: '/auth/callback' } as RouteLocationNormalized);

      expect(result).toBeUndefined();
      expect(mockNavigateTo).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should redirect to login if auth check throws error', async () => {
      mockIsTokenExpired.mockImplementation(() => {
        throw new Error('Test error');
      });

      await middleware({ path: '/dashboard' } as RouteLocationNormalized);

      expect(mockNavigateTo).toHaveBeenCalledWith('/login');
    });
  });
});
