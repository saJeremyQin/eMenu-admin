import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Exclude Playwright E2E files so Vitest doesn't try to run Playwright tests
    exclude: ['node_modules', 'test-results', 'src/tests/e2e/**', 'playwright.config.ts'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setupTests.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
});
