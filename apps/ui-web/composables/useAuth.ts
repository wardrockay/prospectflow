export const useAuth = () => {
  const config = useRuntimeConfig();

  // Store access token in httpOnly cookie
  const accessToken = useCookie('access_token', {
    maxAge: 3600, // 1 hour
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  const idToken = useCookie('id_token', {
    maxAge: 3600, // 1 hour
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  const refreshToken = useCookie('refresh_token', {
    maxAge: 2592000, // 30 days
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  /**
   * Redirect to Cognito Hosted UI for login
   */
  const login = () => {
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
  const logout = async () => {
    try {
      // Clear session in backend
      if (accessToken.value) {
        await $fetch(`${config.public.apiBase}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken.value}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all tokens
      accessToken.value = null;
      idToken.value = null;
      refreshToken.value = null;

      // Redirect to Cognito logout
      const logoutUrl =
        `${config.public.cognitoHostedUI}/logout?` +
        `client_id=${config.public.cognitoClientId}&` +
        `logout_uri=${encodeURIComponent(config.public.logoutUri)}`;

      navigateTo(logoutUrl, { external: true });
    }
  };

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = computed(() => !!accessToken.value);

  return {
    login,
    logout,
    isAuthenticated,
    accessToken,
    idToken,
    refreshToken,
  };
};
