<script setup lang="ts">
  const route = useRoute();

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
   * Check if a route is active (exact match or starts with the path)
   */
  const isActive = (to: string): boolean => {
    return route.path === to || route.path.startsWith(`${to}/`);
  };
</script>

<template>
  <nav class="flex items-center gap-1">
    <UButton
      v-for="item in navigation"
      :key="item.to"
      :to="item.to"
      :variant="isActive(item.to) ? 'soft' : 'ghost'"
      :color="isActive(item.to) ? 'primary' : 'gray'"
      :icon="item.icon"
      :class="{
        'border-b-2 border-primary': isActive(item.to),
        'transition-colors duration-200': true,
      }"
    >
      {{ item.label }}
    </UButton>
  </nav>
</template>
