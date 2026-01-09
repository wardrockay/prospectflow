<script setup lang="ts">
const { logout } = useAuth();

const navigation = [
  {
    label: 'Campagnes',
    to: '/campaigns',
    icon: 'i-heroicons-folder',
  },
  {
    label: 'Prospects',
    to: '/prospects',
    icon: 'i-heroicons-users',
  },
];

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
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm sticky top-0 z-50">
      <UContainer class="py-4">
        <div class="flex items-center justify-between">
          <!-- Logo -->
          <NuxtLink to="/" class="flex items-center gap-2">
            <span class="text-2xl font-bold text-primary">ProspectFlow</span>
          </NuxtLink>

          <!-- Navigation -->
          <nav class="hidden md:flex items-center gap-1">
            <UButton
              v-for="item in navigation"
              :key="item.to"
              :to="item.to"
              variant="ghost"
              :icon="item.icon"
            >
              {{ item.label }}
            </UButton>
          </nav>

          <!-- User Menu -->
          <div class="flex items-center gap-4">
            <UDropdown :items="userMenuItems">
              <UButton
                icon="i-heroicons-user-circle"
                variant="ghost"
                trailing-icon="i-heroicons-chevron-down"
              >
                Mon compte
              </UButton>
            </UDropdown>
          </div>
        </div>
      </UContainer>
    </header>

    <!-- Main Content -->
    <main class="py-8">
      <UContainer>
        <slot />
      </UContainer>
    </main>

    <!-- Footer (optional) -->
    <footer class="mt-auto py-8 border-t bg-white">
      <UContainer>
        <div class="text-center text-sm text-gray-500">
          © {{ new Date().getFullYear() }} ProspectFlow. Tous droits réservés.
        </div>
      </UContainer>
    </footer>
  </div>
</template>
