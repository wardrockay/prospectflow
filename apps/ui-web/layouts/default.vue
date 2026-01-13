<script setup lang="ts">
  const isMobileMenuOpen = ref(false);

  const toggleMobileMenu = () => {
    isMobileMenuOpen.value = !isMobileMenuOpen.value;
  };
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Header -->
    <LayoutHeader :is-mobile-menu-open="isMobileMenuOpen" @toggle-mobile-menu="toggleMobileMenu" />

    <!-- Mobile Menu Slideover -->
    <LayoutMobileMenu v-model="isMobileMenuOpen" />

    <!-- Main Content -->
    <main class="py-8 flex-1">
      <UContainer>
        <slot />
      </UContainer>
    </main>

    <!-- Footer -->
    <LayoutFooter />
  </div>
</template>
