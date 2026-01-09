export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated } = useAuth();

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/auth/callback'];

  // Redirect to login if not authenticated and trying to access protected route
  if (!isAuthenticated.value && !publicRoutes.includes(to.path)) {
    return navigateTo('/login');
  }

  // Redirect to home if authenticated and trying to access login page
  if (isAuthenticated.value && to.path === '/login') {
    return navigateTo('/');
  }
});
