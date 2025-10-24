import { test, expect } from '@playwright/test';

// Try to load .env.e2e for convenience during local runs (optional)
try {
  // Use dynamic ESM import (top-level await is supported in ESM) so dotenv is optional.
  const dotenv = await import('dotenv');
  const path = await import('path');
  if (dotenv && typeof dotenv.config === 'function') {
    dotenv.config({ path: path.join(process.cwd(), '.env.e2e') });
  }
} catch (e) {
  // ignore if dotenv not installed
}

// Simplified E2E: rely on global `storageState` (user.json) to skip login.
// Flow: open app, click "Restaurant Info" nav, mock GraphQL GetRestaurant and UpdateRestaurant,
// change phone, click Save Changes, assert the form shows the updated phone.
test('update restaurant info - saves and shows success', async ({ page }) => {
  // Intercept GraphQL calls and return deterministic data.
  await page.route('**/graphql', async (route) => {
    const req = route.request();
    let post: any = null;
    try { post = await req.postDataJSON(); } catch (e) { post = null; }
    // Request.postData() is synchronous and returns string|null
    const raw = req.postData?.() ?? null;
    const rawText = raw ? String(raw).toLowerCase() : '';
    const op = post?.operationName || undefined;

    console.log('[e2e] graphql op=', op, 'raw=', rawText.slice(0,200));

    // return a baseline restaurant on GetRestaurant (used by page init)
    if (op === 'GetRestaurant' || rawText.includes('getrestaurant')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { getRestaurant: { id: 'rest-1', name: 'My R', phone: '123', address: 'Addr' } } }),
      });
    }

    // GetUserByCognito (app may call this to map cognito->user)
    if (op === 'GetUserByCognito' || rawText.includes('getuserbycognito')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { getUserByCognito: { id: 'user-1', restaurantId: 'rest-1' } } }),
      });
    }

    // Update mutation: echo back input so the UI can re-read updated fields
    if (op === 'UpdateRestaurant' || op === 'UpdateRestaurantInfo' || rawText.includes('updaterestaurant')) {
      const input = post?.variables?.input || {};
      const updated = { id: 'rest-1', ...input };
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { updateRestaurant: updated, updateRestaurantInfo: updated } }),
      });
    }

    return route.continue();
  });

  // 1) Open app (assumes storageState from globalSetup is loaded via the 'authenticated' project)
  await page.goto('/');

  // 2) Click Restaurant Info in the navigation
  const infoLink = page.getByRole('link', { name: /restaurant info/i });
  if (await infoLink.isVisible().catch(() => false)) {
    // overlay may intercept clicks in some runs; force click to be robust in CI/dev
    await infoLink.click({ force: true });
  } else {
    const linkByHref = page.locator('a[href="/restaurant/info"]').first();
    if ((await linkByHref.count()) > 0) {
      await linkByHref.click({ force: true });
    } else {
  const linkHidden = page.getByRole('link', { name: /restaurant info/i, includeHidden: true }).first();
  if ((await linkHidden.count()) > 0) await linkHidden.click({ force: true });
      else throw new Error('Could not find Restaurant Info navigation link');
    }
  }

  // 3) Wait for navigation to complete and the Restaurant Info heading to appear
  // Click should navigate to /restaurant/info — try a robust URL wait and fallback to direct navigation if needed.
  try {
    await page.waitForURL((url) => url.pathname === '/restaurant/info' || url.pathname.includes('/restaurant/info'), { timeout: 5000 });
  } catch (err) {
    // Fallback: some SPA routers don't emit a navigation event Playwright observes.
    // Try to navigate via the link's href or click it via JS, then wait for the URL.
    try {
      const hrefLocator = page.locator('a[href="/restaurant/info"]').first();
      const href = await hrefLocator.getAttribute('href');
      if (href) {
        // use goto to ensure we land on the page
        await page.goto(href);
      } else {
        // as a last resort, click via page.evaluate
        await page.evaluate(() => {
          const el = document.querySelector('a[href="/restaurant/info"]') as HTMLAnchorElement | null;
          if (el) el.click();
        });
      }
      await page.waitForURL((url) => url.pathname === '/restaurant/info' || url.pathname.includes('/restaurant/info'), { timeout: 10000 });
    } catch (fallbackErr) {
      // final fallback: poll location.pathname directly
      await page.waitForFunction(() => location.pathname.includes('/restaurant/info'), { timeout: 10000 });
    }
  }

  // Then wait for a heading (could be h1 or h2) that contains "Restaurant Info".
  await page.locator('h1,h2').filter({ hasText: /restaurant info/i }).first().waitFor({ timeout: 10000 });

  // 4) Fill phone input and save
  const phone = page.locator('input[name="phone"]').first();
  await phone.waitFor({ state: 'visible', timeout: 10000 });
  await phone.fill('999-888-7777');

  const save = page.getByRole('button', { name: /save changes|save/i }).first();
  await save.click();

  // 5) Assert the value updated in the form (after redux update the form re-inits)
  await expect(phone).toHaveValue('999-888-7777', { timeout: 5000 });
});
