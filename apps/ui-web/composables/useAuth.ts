export const useAuth = () => {
  const config = useRuntimeConfig();
  const router = useRouter();

  // Store access token in httpOnly cookie
  const accessToken = useCookie('access_token', {
    maxAge: 3600, // 1 hour
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
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
      // Clear local token
      accessToken.value = null;

      // Redirect to Cognito logout
      const logoutUrl =
        `${config.public.cognitoHostedUI}/logout?` +
        `client_id=${config.public.cognitoClientId}&` +
        `logout_uri=${encodeURIComponent(window.location.origin)}`;

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
  };
};
