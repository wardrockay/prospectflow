<script setup lang="ts">
  const props = defineProps<{
    status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  }>();

  const statusConfig = {
    draft: {
      label: 'Brouillon',
      color: 'gray' as const,
    },
    active: {
      label: 'Actif',
      color: 'green' as const,
    },
    paused: {
      label: 'En pause',
      color: 'yellow' as const,
    },
    completed: {
      label: 'Terminé',
      color: 'blue' as const,
    },
    archived: {
      label: 'Archivé',
      color: 'gray' as const,
    },
  };

  const config = computed(() => statusConfig[props.status]);
</script>

<template>
  <UBadge :color="config.color" variant="subtle" size="xs">
    {{ config.label }}
  </UBadge>
</template>
