import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Nuxt composables
const mockNavigateTo = vi.fn();
const mockIsAuthenticated = { value: true };
const mockIsTokenExpired = vi.fn(() => false);

// Mock useAuth as global (Nuxt auto-import)
const mockUseAuth = vi.fn(() => ({
  isAuthenticated: mockIsAuthenticated,
  isTokenExpired: mockIsTokenExpired,
}));

// Set up global mocks before importing the middleware
vi.stubGlobal('navigateTo', mockNavigateTo);
vi.stubGlobal('useAuth', mockUseAuth);
vi.stubGlobal('defineNuxtRouteMiddleware', (fn: any) => fn);

// Import after mocking
import authMiddleware from './auth';

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.value = true;
    mockIsTokenExpired.mockReturnValue(false);
  });

  describe('Protected routes', () => {
    it('should allow access when authenticated', () => {
      const result = authMiddleware({ path: '/dashboard' } as any, {} as any);
      expect(result).toBeUndefined();
      expect(mockNavigateTo).not.toHaveBeenCalled();
    });

    it('should redirect to login when not authenticated', () => {
      mockIsAuthenticated.value = false;

      authMiddleware({ path: '/dashboard' } as any, {} as any);

      expect(mockNavigateTo).toHaveBeenCalledWith('/login');
    });

    it('should redirect to login with expired param when token expired', () => {
      mockIsTokenExpired.mockReturnValue(true);

      authMiddleware({ path: '/dashboard' } as any, {} as any);

      expect(mockNavigateTo).toHaveBeenCalledWith({
        path: '/login',
        query: { expired: 'true' },
      });
    });
  });

  describe('Public routes', () => {
    it('should allow access to login page when not authenticated', () => {
      mockIsAuthenticated.value = false;

      const result = authMiddleware({ path: '/login' } as any, {} as any);

      expect(result).toBeUndefined();
      expect(mockNavigateTo).not.toHaveBeenCalled();
    });

    it('should redirect to home when accessing login while authenticated', () => {
      mockIsAuthenticated.value = true;

      authMiddleware({ path: '/login' } as any, {} as any);

      expect(mockNavigateTo).toHaveBeenCalledWith('/');
    });

    it('should allow access to callback page', () => {
      mockIsAuthenticated.value = false;

      const result = authMiddleware({ path: '/auth/callback' } as any, {} as any);

      expect(result).toBeUndefined();
      expect(mockNavigateTo).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should redirect to login if auth check throws error', () => {
      mockIsTokenExpired.mockImplementation(() => {
        throw new Error('Test error');
      });

      authMiddleware({ path: '/dashboard' } as any, {} as any);

      expect(mockNavigateTo).toHaveBeenCalledWith('/login');
    });
  });
});
