<script setup lang="ts">
  /**
   * Root App Component
   * Manages background token refresh to maintain active sessions
   */

  const { isAuthenticated, isTokenExpiringSoon, refreshToken } = useAuth();

  // Background token refresh check
  // Runs every 2 minutes to check if token needs refresh
  onMounted(() => {
    const CHECK_INTERVAL = 2 * 60 * 1000; // 2 minutes

    const checkTokenExpiration = async () => {
      // Only check if user is authenticated
      if (!isAuthenticated.value) return;

      // If token is expiring soon (< 30 min), refresh it proactively
      if (isTokenExpiringSoon()) {
        try {
          const refreshed = await refreshToken();
          if (refreshed) {
            console.log('Token refreshed successfully in background');
          }
        } catch (error) {
          console.error('Background token refresh failed:', error);
        }
      }
    };

    // Run check immediately on mount
    checkTokenExpiration();

    // Set up interval for periodic checks
    const intervalId = setInterval(checkTokenExpiration, CHECK_INTERVAL);

    // Cleanup on unmount
    onUnmounted(() => {
      clearInterval(intervalId);
    });
  });
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <UNotifications />
  </div>
</template>
