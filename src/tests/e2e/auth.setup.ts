import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';
// Note: this globalSetup expects credentials to be provided via environment variables.
// We deliberately do not load a local `.env.e2e` here to avoid accidental commits of secrets.

// Where the authenticated storage state will be saved
const AUTH_DIR = path.join(process.cwd(), 'test-results', 'playwright', '.auth');
const AUTH_FILE = path.join(AUTH_DIR, 'user.json');

async function collectFailureDiagnostics(page: { url: () => string; screenshot: (arg0: { path: string; fullPage: boolean }) => Promise<void>; content: () => Promise<string> }) {
  const screenshotPath = path.join(AUTH_DIR, 'auth-setup-failure.png');
  const htmlPath = path.join(AUTH_DIR, 'auth-setup-failure.html');

  try {
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.error('auth.setup: saved screenshot to', screenshotPath);
  } catch (err) {
    console.error('auth.setup: failed to save screenshot:', err);
  }

  try {
    const html = await page.content();
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.error('auth.setup: saved page HTML to', htmlPath);
  } catch (err) {
    console.error('auth.setup: failed to save HTML snapshot:', err);
  }

  console.error('auth.setup: current URL on failure:', page.url());
}

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

  // Fill in the login form and wait for either success or a visible auth error/challenge.
  try {
    await page.getByPlaceholder('Username or Email').fill(username);
    await page.getByPlaceholder(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();

    console.log('auth.setup: submitted sign-in, waiting for auth outcome');

    const logoutButton = page.getByRole('button', { name: /^logout$/i });
    const authErrorAlert = page.locator('.amplify-alert, [data-amplify-alert]');
    const challengeHint = page.getByText(
      /confirm sign in|verification code|enter code|new password required|mfa|incorrect username or password|not authorized/i,
      { exact: false }
    );

    const outcome = await Promise.race([
      logoutButton.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'success' as const),
      authErrorAlert.first().waitFor({ state: 'visible', timeout: 30000 }).then(() => 'error' as const),
      challengeHint.first().waitFor({ state: 'visible', timeout: 30000 }).then(() => 'challenge' as const),
    ]);

    if (outcome !== 'success') {
      await collectFailureDiagnostics(page);

      let visibleMessage = '';
      try {
        visibleMessage = await authErrorAlert.first().innerText({ timeout: 1000 });
      } catch {
        try {
          visibleMessage = await challengeHint.first().innerText({ timeout: 1000 });
        } catch {
          visibleMessage = '';
        }
      }

      throw new Error(
        `Authentication did not reach logged-in state. Outcome=${outcome}. Visible message=${visibleMessage || 'N/A'}`
      );
    }

    console.log('auth.setup: detected Logout button, login appears successful');
  } catch (e) {
    await collectFailureDiagnostics(page);
    console.error('auth.setup: sign-in flow failed:', e);
    await browser.close();
    throw e;
  }

  // No navigation required: rely on the presence of the Logout button to indicate
  // that authentication completed and tokens/cookies/localStorage have been set.
  // This keeps globalSetup minimal — we only need a valid storageState for tests.
  // Save storage state for reuse in tests
  await context.storageState({ path: AUTH_FILE });
  console.log('auth.setup: storage state saved to', AUTH_FILE);
  await browser.close();
}
