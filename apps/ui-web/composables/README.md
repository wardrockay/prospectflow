# Composables

This directory contains Vue 3 Composition API composables (reusable logic functions).

## Auto-Import

All composables in this directory are auto-imported by Nuxt 3 and can be used directly in components and pages without explicit imports.

## Naming Convention

- Use `use` prefix for composables (e.g., `useAuth.ts`, `useApi.ts`)
- Export the composable function as the default or named export

## Available Composables

- `useAuth.ts` - Authentication state and actions (Cognito integration)

## Usage Example

```vue
<script setup lang="ts">
  // No import needed - auto-imported by Nuxt
  const { isAuthenticated, user, login, logout } = useAuth();
</script>
```
