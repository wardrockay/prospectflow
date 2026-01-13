<script setup lang="ts">
  const currentYear = new Date().getFullYear();
</script>

<template>
  <footer class="mt-auto py-8 border-t bg-white">
    <UContainer>
      <div class="text-center text-sm text-gray-500">
        © {{ currentYear }} ProspectFlow. Tous droits réservés.
      </div>
    </UContainer>
  </footer>
</template>
