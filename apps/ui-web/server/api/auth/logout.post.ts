export default defineEventHandler(async (event) => {
  try {
    // Get access token from cookie
    const accessToken = getCookie(event, 'access_token');

    // Optional: Call backend API to clear session if implemented
    // This would integrate with auth-core session service from Story 0.4
    if (accessToken) {
      const config = useRuntimeConfig();
      try {
        await $fetch(`${config.public.apiBase}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch (error) {
        // Log but don't fail - cookies will still be cleared
        console.error('Backend logout failed:', error);
      }
    }

    // Clear all authentication cookies
    deleteCookie(event, 'access_token', { path: '/' });
    deleteCookie(event, 'id_token', { path: '/' });
    deleteCookie(event, 'refresh_token', { path: '/' });
    deleteCookie(event, 'token_expires_at', { path: '/' });

    return {
      message: 'Logged out successfully',
      success: true,
    };
  } catch (error) {
    console.error('Logout error:', error);
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la déconnexion',
    });
  }
});
