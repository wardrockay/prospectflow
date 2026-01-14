import type { RouteLocationNormalized } from 'vue-router';

export default defineNuxtRouteMiddleware(async (to: RouteLocationNormalized) => {
  try {
    const { isAuthenticated, isTokenExpired, isTokenExpiringSoon, refreshToken } = useAuth();

    // Public routes that don't require authentication
    const publicRoutes = ['/login', '/auth/callback'];

    // Check if accessing protected route
    const isProtectedRoute = !publicRoutes.includes(to.path);

    // If token is expiring soon, try to refresh it proactively
    if (isTokenExpiringSoon() && !isTokenExpired() && isProtectedRoute) {
      try {
        await refreshToken();
      } catch (error) {
        console.error('Proactive token refresh failed:', error);
        // Continue anyway, will be caught by expiration check below
      }
    }

    // Handle expired token
    if (isTokenExpired() && isProtectedRoute) {
      // Try to refresh token before redirecting to login
      try {
        const refreshed = await refreshToken();
        if (refreshed) {
          // Token refreshed successfully, allow navigation
          return;
        }
      } catch (error) {
        console.error('Token refresh failed on expiration:', error);
      }

      // Refresh failed, redirect to login with expiration message
      return navigateTo({
        path: '/login',
        query: { expired: 'true' },
      });
    }

    // Redirect to login if not authenticated and trying to access protected route
    if (!isAuthenticated.value && isProtectedRoute) {
      return navigateTo('/login');
    }

    // Redirect to home if authenticated and trying to access login page
    if (isAuthenticated.value && to.path === '/login') {
      return navigateTo('/');
    }
  } catch (error) {
    // If auth check fails, redirect to login for safety
    console.error('Auth middleware error:', error);
    return navigateTo('/login');
  }
});
