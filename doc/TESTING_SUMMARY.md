# Testing summary — Unit & Integration (recent work)

This document summarizes the unit and integration testing work completed in the past two days (local branch `testautomation`). It explains the tools used, the core code changes that made tests easier to write, the tests added, run instructions, and recommendations.

---

## 1) High-level overview

- Scope: Frontend tests for the `eMenu-admin` app (React + Redux Toolkit). Focused on making Redux slices testable (user and restaurant slices) and adding an integration test for the Restaurant navigation flow.
- Two categories:
  - Unit tests: Redux slice reducers and thunks (userSlice, restaurantSlice).
  - Integration test: Render the real `App` (jsdom) and test the user login → left navigation → Restaurant Info behavior (create vs info).

---

## 2) Tools and versions (project devDependencies)

- Vitest — test runner (configured in `vitest.config.js`, environment `jsdom` for integration tests)
- @testing-library/react — render and DOM queries
- @testing-library/user-event — user interactions
- @testing-library/jest-dom — extended DOM matchers
- msw — optionally available if you prefer network interception (not used in current tests)
- jsdom — DOM environment for Vitest

See `package.json` for exact versions used in the workspace.

---

## 3) Core code changes that improved testability

1. Lazy, injectable API client for tests

  - Problem: module-level creation of the Amplify GraphQL client made it hard to mock for tests (hoisting / TDZ issues).
  - Change: both `src/store/userSlice.js` and `src/store/restaurantSlice.js` were refactored to export a small injection API:

    - let __apiClient = null;
    - export function setApiClient(client) { __apiClient = client; }
    - function getApiClient() { if (!__apiClient) __apiClient = generateClient(); return __apiClient; }

  - Benefit: tests can inject a deterministic mock `graphql` implementation per-test via `setApiClient(mockClient)`.

2. Tests moved away from fragile module-level mocks to per-test injection.

---

## 4) Unit tests added

- `src/store/__tests__/userSlice.test.js` — covers reducers and `fetchUser` thunk. Uses `setApiClient` to inject a mocked `graphql` response. Tests include edge cases: empty/partial payloads and pending→fulfilled/rejected flows.
- `src/store/__tests__/restaurantSlice.test.js` — parity tests for the restaurant slice: reducers, `fetchRestaurant` thunk (fulfilled & rejected), and reducer edge cases. Also uses `setApiClient` injection.

These tests are focused, fast, and run under Node environment (no DOM required).

---

## 5) Integration test added

- `src/integration/__tests__/restaurant-flow.test.jsx`
  - Purpose: render the real `App` under `jsdom`, simulate a logged-in user and the navigation click sequence, and assert which page is shown:
    1. Mock `aws-amplify/auth.getCurrentUser` to simulate logged in user
    2. Mock `@aws-amplify/ui-react` (Authenticator) to avoid requiring Amplify.configure in tests
    3. Inject a mock GraphQL client (via `setApiClient`) that returns:
       - `getUserByCognito` with `restaurantId: null` → expects to see CreateRestaurant page
       - `getUserByCognito` with `restaurantId: 'r1'` and `getRestaurant` → expects to see RestaurantInfo
    4. Render `<App />` inside a real Redux `Provider` and rely on `App`'s Router.
  - Important details:
    - Because `App` includes `BrowserRouter` and `Authenticator`, the test mocks `@aws-amplify/ui-react` Provider and `useAuthenticator` to return `authenticated` and to avoid nested Router issues.
    - The test waits for the navigation link with `await screen.findByRole('link', { name: /restaurant info/i, hidden: true })` to be robust even when the submenu is collapsed.
    - Assertions use `findByRole` / `findByDisplayValue` instead of immediate `getBy*` to avoid timing races.

---

## 6) How to run tests locally

All commands assume you are in repository root (`eMenu-admin`).

1) Install dependencies (if not already):

```bash
npm ci
```

2) Run unit tests (all):

```bash
npm run test:run
```

3) Run single integration test file:

```bash
npx vitest run src/integration/__tests__/restaurant-flow.test.jsx --reporter verbose
```

4) Run a single unit test file:

```bash
npx vitest run src/store/__tests__/userSlice.test.js --reporter verbose
```

Notes:
- Vitest environment for integration tests is configured to `jsdom` in `vitest.config.js`.
- If you need deterministic output in CI, ensure `npm ci` uses the same lockfile as in this workspace.

---

## 7) Core snippets (what tests rely on)

- setApiClient injection (example used in tests):

```javascript
// in test
const mockClient = { graphql: vi.fn().mockResolvedValue({ data: { getUserByCognito: { id: 'u1', restaurantId: null } } }) };
setApiClient(mockClient);
```

- Integration test waits for nav link and clicks it:

```javascript
const restaurantLink = await screen.findByRole('link', { name: /restaurant info/i, hidden: true });
await userEvent.click(restaurantLink);
```

---

## 8) Test status and results

- Local runs (developer machine):
  - Unit tests (user & restaurant slices): PASS (file-local runs verified during development)
  - Integration test `restaurant-flow.test.jsx`: PASS (both scenarios passed locally)

---

## 9) Next recommendations

1. Add CI step to run Vitest (all tests) on pushes/PRs to validate regressions. Use `npm ci && npm run test:run`.
2. Consider adding `afterEach` or global setup to always call `setApiClient(null)` to avoid cross-test pollution.
3. Optionally add MSW handlers if you prefer to mock the network layer rather than injecting the client; MSW is useful if you want to test network error variants centrally.
4. Expand integration tests to cover additional flows: permission mismatch, error handling, form submit for CreateRestaurant.


