<script setup lang="ts">
  const { logout } = useAuth();

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
      Mon compte
    </UButton>
  </UDropdown>
</template>
