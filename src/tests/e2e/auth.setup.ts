import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';
// Note: this globalSetup expects credentials to be provided via environment variables.
// We deliberately do not load a local `.env.e2e` here to avoid accidental commits of secrets.

// Where the authenticated storage state will be saved
const AUTH_DIR = path.join(process.cwd(), 'test-results', 'playwright', '.auth');
const AUTH_FILE = path.join(AUTH_DIR, 'user.json');

export default async function globalSetup(config: FullConfig) {
  // Ensure auth dir exists
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  // Try to load .env.e2e via dotenv if available for local convenience.
  // Use dynamic import so this file stays ESM-compatible and dotenv remains optional.
  try {
    const dotenv = await import('dotenv');
    if (dotenv && typeof dotenv.config === 'function') {
      dotenv.config({ path: path.join(process.cwd(), '.env.e2e') });
      console.log('auth.setup: loaded .env.e2e via dotenv (if present)');
    }
  } catch (e) {
    // dotenv not installed or failed to load — it's optional
  }

  const username = process.env.E2E_USERNAME || process.env.E2E_USER || process.env.TEST_E2E_USERNAME;
  const password = process.env.E2E_PASSWORD || process.env.E2E_PASS || process.env.TEST_E2E_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'E2E credentials missing. Set E2E_USERNAME and E2E_PASSWORD in the environment or create a local .env.e2e file (gitignored).'
    );
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to the login page. webServer should already be started by Playwright.
  const base = config.projects?.[0]?.use?.baseURL || process.env.E2E_BASE_URL || 'http://localhost:5173';
  await page.goto(`${base}/auth`);

  // Fill in the login form using the known test account (hard-coded for now).
  // NOTE: This was temporarily hard-coded to match the earlier passing test run.
  try {
  await page.getByPlaceholder('Username or Email').fill(username);
  await page.getByPlaceholder(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for the app to reflect that the user is authenticated (header shows Logout)
    console.log('auth.setup: submitted sign-in, waiting for Logout button');
    await page.getByRole('button', { name: 'Logout' }).waitFor({ timeout: 30000 });
    console.log('auth.setup: detected Logout button — login appears successful');
  } catch (e) {
    console.error('Auth setup: failed to fill login form:', e);
    await browser.close();
    throw e;
  }

  // Wait until a protected page loads to ensure tokens have been set and read by the app
  // The DishManagerPage uses an <h2> with text "Dish Management", so wait for that instead.
  await page.goto(`${base}/dishes`);
  console.log('auth.setup: navigated to /dishes, waiting for protected page UI');
  try {
    await page.getByRole('heading', { name: 'Dish Management' }).waitFor({ timeout: 30000 });
  } catch (err) {
    console.error('auth.setup: failed to find Dish Management heading after login; url=', page.url());
    // Log h2 text content if any to help debugging
    try {
      const headings = await page.locator('h2').allTextContents();
      console.error('auth.setup: h2 contents:', headings);
    } catch (e) {
      console.error('auth.setup: could not read h2 contents:', e);
    }
    throw err;
  }

  // Save storage state for reuse in tests
  await context.storageState({ path: AUTH_FILE });
  console.log('auth.setup: storage state saved to', AUTH_FILE);
  await browser.close();
}
