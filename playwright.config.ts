import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/tests/e2e',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { outputFolder: 'test-results/playwright/html-report' }]],
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 5000,
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  // Run the auth setup script once before tests. It should create a storage state file
  // that we can reuse in the `authenticated` project below.
  // Use a string path (ESM) so Playwright can load the module in ESM mode.
  globalSetup: './src/tests/e2e/auth.setup.ts',

  // Start the dev server automatically for tests when not already running.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    cwd: '.',
  },
  // Put Playwright artifacts under test-results to keep repo root clean
  // Use a dedicated results folder to avoid clashing with the HTML reporter directory
  outputDir: 'test-results/playwright/results',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    {
      name: 'authenticated',
      // Use the storageState created by the globalSetup script
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'test-results/playwright/.auth/user.json', // load saved authenticated state
      },
      // run the same e2e tests
    },

    // 3. Unauthenticated Project (可选，用于测试未登录状态)
    {
      name: 'unauthenticated',
      use: {
        ...devices['Desktop Chrome'],
      },
    }
  ],
});
