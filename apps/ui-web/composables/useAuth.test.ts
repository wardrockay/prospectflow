import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, computed } from 'vue';

// Shared mock state - declared before vi.mock so hoisting works
const mockTokenValue = { value: String(Date.now() + 3600000) as string | null };
const mockNavigateTo = vi.fn();
const mockFetch = vi.fn();
const mockConfig = {
  public: {
    cognitoHostedUI: 'https://test.auth.cognito.com',
    cognitoClientId: 'test-client-id',
    cognitoRedirectUri: 'http://localhost:4000/auth/callback',
    logoutUri: 'http://localhost:4000/login',
  },
};

// Mock Vue reactivity functions that will use our mockTokenValue
vi.stubGlobal('ref', ref);
vi.stubGlobal('computed', computed);
vi.stubGlobal('navigateTo', mockNavigateTo);
vi.stubGlobal('$fetch', mockFetch);
vi.stubGlobal('useRuntimeConfig', () => mockConfig);

// useCookie mock returns an object with a getter/setter .value that proxies to mockTokenValue
vi.stubGlobal('useCookie', () => ({
  get value() {
    return mockTokenValue.value;
  },
  set value(v: string | null) {
    mockTokenValue.value = v;
  },
}));

// Import after all mocks are set up
import { useAuth } from '~/composables/useAuth';

describe('useAuth Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset token to valid state before each test
    mockTokenValue.value = String(Date.now() + 3600000);
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists and not expired', () => {
      mockTokenValue.value = String(Date.now() + 3600000); // Expires in 1 hour
      const { isAuthenticated } = useAuth();
      expect(isAuthenticated.value).toBe(true);
    });

    it('should return false when token is expired', () => {
      mockTokenValue.value = String(Date.now() - 1000); // Expired 1 second ago
      const { isAuthenticated } = useAuth();
      expect(isAuthenticated.value).toBe(false);
    });

    it('should return false when no token exists', () => {
      mockTokenValue.value = null;
      const { isAuthenticated } = useAuth();
      expect(isAuthenticated.value).toBe(false);
    });
  });

  describe('login', () => {
    it('should redirect to Cognito with correct parameters', () => {
      const { login } = useAuth();
      login();

      expect(mockNavigateTo).toHaveBeenCalledWith(
        expect.stringContaining('https://test.auth.cognito.com/login'),
        { external: true }
      );
      expect(mockNavigateTo).toHaveBeenCalledWith(
        expect.stringContaining('client_id=test-client-id'),
        { external: true }
      );
      expect(mockNavigateTo).toHaveBeenCalledWith(expect.stringContaining('response_type=code'), {
        external: true,
      });
      expect(mockNavigateTo).toHaveBeenCalledWith(
        expect.stringContaining('scope=openid+email+profile'),
        { external: true }
      );
    });
  });

  describe('logout', () => {
    it('should call logout API and redirect to Cognito logout', async () => {
      mockFetch.mockResolvedValue({ success: true });

      const { logout } = useAuth();
      await logout();

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
      });

      expect(mockNavigateTo).toHaveBeenCalledWith(
        expect.stringContaining('https://test.auth.cognito.com/logout'),
        { external: true }
      );
      expect(mockNavigateTo).toHaveBeenCalledWith(expect.stringContaining('logout_uri='), {
        external: true,
      });
    });

    it('should redirect to Cognito logout even if API call fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { logout } = useAuth();
      await logout();

      expect(mockNavigateTo).toHaveBeenCalledWith(
        expect.stringContaining('https://test.auth.cognito.com/logout'),
        { external: true }
      );
    });
  });

  describe('isTokenExpired', () => {
    it('should return true when token is expired', () => {
      mockTokenValue.value = String(Date.now() - 1000);
      const { isTokenExpired } = useAuth();
      expect(isTokenExpired()).toBe(true);
    });

    it('should return false when token is not expired', () => {
      mockTokenValue.value = String(Date.now() + 3600000);
      const { isTokenExpired } = useAuth();
      expect(isTokenExpired()).toBe(false);
    });

    it('should return true when no token exists', () => {
      mockTokenValue.value = null;
      const { isTokenExpired } = useAuth();
      expect(isTokenExpired()).toBe(true);
    });
  });
});
