import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setupTests.js'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'lcov'],
    },
  },
});
