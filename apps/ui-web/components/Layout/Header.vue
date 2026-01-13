<script setup lang="ts">
  interface Props {
    isMobileMenuOpen?: boolean;
  }

  defineProps<Props>();

  const emit = defineEmits<{
    (e: 'toggle-mobile-menu'): void;
  }>();
</script>

<template>
  <header class="bg-white shadow-sm sticky top-0 z-50">
    <UContainer class="py-4">
      <div class="flex items-center justify-between">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-2">
          <span class="text-2xl font-bold text-primary">ProspectFlow</span>
        </NuxtLink>

        <!-- Desktop Navigation -->
        <LayoutNavigation class="hidden md:flex" />

        <!-- Right side: User Menu (desktop) + Hamburger (mobile) -->
        <div class="flex items-center gap-2">
          <!-- User Menu (desktop only) -->
          <LayoutUserMenu class="hidden md:block" />

          <!-- Hamburger button (mobile only) -->
          <UButton
            class="md:hidden"
            icon="i-heroicons-bars-3"
            variant="ghost"
            aria-label="Ouvrir le menu"
            @click="emit('toggle-mobile-menu')"
          />
        </div>
      </div>
    </UContainer>
  </header>
</template>
