export const useAuth = () => {
  const config = useRuntimeConfig();

  // Access token expiration time (readable client-side)
  const tokenExpiresAt = useCookie('token_expires_at', {
    maxAge: 3600,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  /**
   * Check if token is expired
   */
  const isTokenExpired = (): boolean => {
    if (!tokenExpiresAt.value) return true;
    const expiresAt = parseInt(tokenExpiresAt.value, 10);
    return Date.now() >= expiresAt;
  };

  /**
   * Check if token will expire soon (within 30 minutes)
   * Refresh proactively to avoid any disconnection
   */
  const isTokenExpiringSoon = (): boolean => {
    if (!tokenExpiresAt.value) return true;
    const expiresAt = parseInt(tokenExpiresAt.value, 10);
    const thirtyMinutes = 30 * 60 * 1000;
    return Date.now() >= expiresAt - thirtyMinutes;
  };

  /**
   * Check if user is authenticated with valid (non-expired) token
   */
  const isAuthenticated = computed(() => {
    return !!tokenExpiresAt.value && !isTokenExpired();
  });

  /**
   * Refresh authentication token using refresh_token
   * @returns Promise<boolean> - true if refresh successful
   */
  const refreshToken = async (): Promise<boolean> => {
    try {
      const response = await $fetch<{ success: boolean; expiresAt: number }>('/api/auth/refresh', {
        method: 'POST',
      });

      if (response.success) {
        // Token cookie will be updated by server
        // Update local expiration time
        tokenExpiresAt.value = response.expiresAt.toString();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  };

  /**
   * Redirect to Cognito Hosted UI for login
   */
  const login = (): void => {
    const cognitoUrl =
      `${config.public.cognitoHostedUI}/login?` +
      `client_id=${config.public.cognitoClientId}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(config.public.cognitoRedirectUri)}&` +
      `scope=openid+email+profile`;

    navigateTo(cognitoUrl, { external: true });
  };

  /**
   * Logout: clear session and redirect to Cognito logout
   */
  const logout = async (): Promise<void> => {
    try {
      // Clear session via Nuxt server API (which calls backend and clears cookies)
      await $fetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Redirect to Cognito logout
      const logoutUrl =
        `${config.public.cognitoHostedUI}/logout?` +
        `client_id=${config.public.cognitoClientId}&` +
        `logout_uri=${encodeURIComponent(config.public.logoutUri)}`;

      navigateTo(logoutUrl, { external: true });
    }
  };

  return {
    login,
    logout,
    isAuthenticated,
    isTokenExpired,
    isTokenExpiringSoon,
    refreshToken,
  };
};
