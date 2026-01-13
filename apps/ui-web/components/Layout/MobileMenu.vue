<script setup lang="ts">
  const { logout } = useAuth();
  const route = useRoute();

  interface Props {
    modelValue: boolean;
  }

  const props = defineProps<Props>();
  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
  }>();

  const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value),
  });

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

  /**
   * Check if a route is active
   */
  const isActive = (to: string): boolean => {
    return route.path === to || route.path.startsWith(`${to}/`);
  };

  /**
   * Close menu on route change
   */
  watch(
    () => route.path,
    () => {
      isOpen.value = false;
    }
  );

  /**
   * Handle logout from mobile menu
   */
  const handleLogout = () => {
    isOpen.value = false;
    logout();
  };
</script>

<template>
  <USlideover v-model="isOpen" side="left">
    <div class="p-4 h-full flex flex-col">
      <!-- Header with close button -->
      <div class="flex items-center justify-between mb-6">
        <span class="text-xl font-bold text-primary">ProspectFlow</span>
        <UButton
          icon="i-heroicons-x-mark"
          variant="ghost"
          aria-label="Fermer le menu"
          @click="isOpen = false"
        />
      </div>

      <!-- Navigation links -->
      <nav class="flex flex-col gap-2 flex-1">
        <UButton
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          :icon="item.icon"
          :variant="isActive(item.to) ? 'soft' : 'ghost'"
          :color="isActive(item.to) ? 'primary' : 'gray'"
          block
          class="justify-start"
        >
          {{ item.label }}
        </UButton>
      </nav>

      <!-- Logout at bottom -->
      <div class="mt-auto pt-4 border-t">
        <UButton
          icon="i-heroicons-arrow-right-on-rectangle"
          variant="ghost"
          color="red"
          block
          class="justify-start"
          @click="handleLogout"
        >
          Déconnexion
        </UButton>
      </div>
    </div>
  </USlideover>
</template>
