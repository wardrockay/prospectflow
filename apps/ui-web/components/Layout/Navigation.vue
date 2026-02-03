<script setup lang="ts">
  const route = useRoute();

  // Track pending imports count across all campaigns
  const pendingImportsCount = ref(0);

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
      badge: computed(() => pendingImportsCount.value),
    },
    {
      label: 'Lead Magnet',
      to: '/lead-magnet',
      icon: 'i-heroicons-gift',
    },
  ];

  /**
   * Check if a route is active (exact match or starts with the path)
   */
  const isActive = (to: string): boolean => {
    return route.path === to || route.path.startsWith(`${to}/`);
  };

  // TODO: Fetch pending imports count from API when campaigns are available
  // For now, this is a placeholder that can be enhanced later
  onMounted(() => {
    // Future: Fetch pending imports count
    // const campaigns = await fetchCampaigns();
    // for (const campaign of campaigns) {
    //   const { pendingCount } = useImportsList(campaign.id, 'uploaded');
    //   await fetchImports();
    //   pendingImportsCount.value += pendingCount.value;
    // }
  });
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
      <div class="flex items-center gap-2">
        <span>{{ item.label }}</span>
        <UBadge
          v-if="item.badge && item.badge > 0"
          color="red"
          variant="solid"
          size="xs"
        >
          {{ item.badge }}
        </UBadge>
      </div>
    </UButton>
  </nav>
</template>
