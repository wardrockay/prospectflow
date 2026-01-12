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
   * Check if user is authenticated with valid (non-expired) token
   */
  const isAuthenticated = computed(() => {
    return !!tokenExpiresAt.value && !isTokenExpired();
  });

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
  };
};
