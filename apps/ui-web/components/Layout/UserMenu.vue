<script setup lang="ts">
  const { logout } = useAuth();

  /**
   * Extract email from JWT token (client-side decode)
   * JWT format: header.payload.signature
   * Payload contains: { sub, email, cognito:username, ... }
   */
  const getUserEmail = (): string | null => {
    try {
      const tokenCookie = useCookie('token_expires_at');
      if (!tokenCookie.value) return null;

      // Get access_token from cookie (if accessible client-side)
      // Note: If httpOnly, we'd need a /api/auth/me endpoint instead
      const accessTokenCookie = useCookie('access_token');
      if (!accessTokenCookie.value) return null;

      // Decode JWT payload (base64url)
      const parts = String(accessTokenCookie.value).split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));
      return payload.email || payload['cognito:username'] || null;
    } catch (error) {
      console.debug('Unable to decode user email from token:', error);
      return null;
    }
  };

  const userEmail = ref<string | null>(getUserEmail());

  const userMenuItems = [
    [
      {
        label: 'Déconnexion',
        icon: 'i-heroicons-arrow-right-on-rectangle',
        click: logout,
      },
    ],
  ];
</script>

<template>
  <UDropdown :items="userMenuItems" :popper="{ placement: 'bottom-end' }">
    <UButton
      icon="i-heroicons-user-circle"
      variant="ghost"
      trailing-icon="i-heroicons-chevron-down"
    >
      {{ userEmail || 'Mon compte' }}
    </UButton>
  </UDropdown>
</template>
