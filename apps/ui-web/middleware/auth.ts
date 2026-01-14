import type { RouteLocationNormalized } from 'vue-router';

export default defineNuxtRouteMiddleware((to: RouteLocationNormalized) => {
  try {
    const { isAuthenticated, isTokenExpired } = useAuth();

    // Public routes that don't require authentication
    const publicRoutes = ['/login', '/auth/callback'];

    // Check if accessing protected route
    const isProtectedRoute = !publicRoutes.includes(to.path);

    // Handle expired token
    if (isTokenExpired() && isProtectedRoute) {
      // Add query param to show expiration message
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
