Playwright E2E setup
=====================

What I added
------------
- `playwright.config.ts` — Playwright test runner configuration (projects for chromium/webkit/firefox, baseURL, timeouts, reporters).
- `tests/e2e/updateRestaurantInfo.spec.ts` — example E2E test that intercepts GraphQL requests and exercises the UpdateRestaurant flow.
- `package.json` script `test:e2e` was added to run `playwright test`.

Install and run (local)
-----------------------
1. Install Playwright in the project:

   npm install -D @playwright/test

2. Install browsers (Playwright will prompt to download browsers):

   npx playwright install

3. Run tests:

   npm run test:e2e

CI recommendations
------------------
- Use Playwright's Docker image or actions/playwright GitHub Action to provide browsers in CI. This avoids large downloads on each run.
- Prefer route interception (as used in the example) to mock GraphQL responses for deterministic tests. Avoid using production backends unless you have a dedicated test environment and cleanup.

Notes
-----
- I didn't install Playwright or download browsers in this change (you asked me not to run installs). If you want, I can run the install and run a smoke test locally.
- The example test assumes GraphQL operations use the network path `**/graphql`. Adjust the route glob if your app uses a different endpoint.
