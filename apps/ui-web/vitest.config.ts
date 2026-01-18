import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  // @ts-expect-error - Vue plugin type mismatch with Vite versions
  plugins: [vue()],
  test: {
    // WSL Memory Management - Prevent OOM-kills (see project-context.md)
    pool: 'forks',        // Use forks instead of threads for memory isolation
    poolOptions: {
      forks: {
        singleFork: true, // Run all tests in a single fork to reduce memory
      },
    },
    maxConcurrency: 5,    // Limit concurrent tests
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', '.nuxt/', 'dist/', '**/*.config.ts'],
    },
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, './'),
      '@': resolve(__dirname, './'),
      '#app': resolve(__dirname, './.nuxt'),
      '@tests': resolve(__dirname, './tests'),
    },
  },
});
