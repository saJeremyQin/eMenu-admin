import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { vi } from 'vitest';

// Mock amplify auth getCurrentUser，try test automation
// update vitest version
vi.mock('aws-amplify/auth', () => ({
  getCurrentUser: vi.fn(),
}));

// Mock Amplify UI to avoid internal BrowserRouter/Router and Amplify configuration errors
vi.mock('@aws-amplify/ui-react', () => {
  return {
    // Authenticator with Provider used in App
    Authenticator: {
      Provider: ({ children }) => React.createElement(React.Fragment, null, children),
    },
    // return a simple hook that provides authStatus
    useAuthenticator: () => ({ authStatus: 'authenticated' }),
  };
});

// Mock the API module to force tests to inject client via setApiClient
vi.mock('aws-amplify/api', () => ({
  generateClient: () => ({ graphql: () => { throw new Error('generateClient should not be used in tests; inject with setApiClient') } }),
}));

// Import app and store - adjust paths if your project exports differently
import App from '../../App';
import { store } from '../../store/store';
import { setApiClient as setRestaurantApiClient } from '../../store/restaurantSlice';
import { setApiClient as setUserApiClient } from '../../store/userSlice';

describe('Restaurant navigation integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    try { setApiClient(null); } catch (e) {}
  });

  it('shows CreateRestaurant when user has no restaurant', async () => {
    const { getCurrentUser } = await import('aws-amplify/auth');
    getCurrentUser.mockResolvedValue({ username: 'u1' });

    const mockClient = {
      graphql: vi.fn(async ({ query }) => {
        const q = typeof query === 'string' ? query : (query && query.loc && query.loc.source && query.loc.source.body) || '';
        // return a user object with restaurantId: null to indicate no restaurant
        if (q.includes('getUserByCognito')) return { data: { getUserByCognito: { id: 'u1', cognitoId: 'c1', email: 'u1@example.com', role: 'boss', restaurantId: null } } };
        // restaurant query returns null when there is no restaurant
        if (q.includes('getRestaurant')) return { data: { getRestaurant: null } };
        return { data: {} };
      }),
    };
    setRestaurantApiClient(mockClient);
    setUserApiClient(mockClient);

    // App already includes a BrowserRouter; avoid wrapping another Router.
    window.history.pushState({}, 'Test page', '/');
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    // Click nav -> Restaurant. Adjust selectors to match your UI.
    // Try a few common roles/labels so tests are resilient.
    // wait for the Restaurant Info link to appear in the DOM (allow hidden in case submenu is collapsed)
    const restaurantLink = await screen.findByRole('link', { name: /restaurant info/i, hidden: true });
    await userEvent.click(restaurantLink);

    // Wait for CreateRestaurant heading to appear
    await screen.findByRole('heading', { name: /create restaurant/i });
  });

  it('shows RestaurantInfo when user has a restaurant', async () => {
    const { getCurrentUser } = await import('aws-amplify/auth');
    getCurrentUser.mockResolvedValue({ username: 'u1' });

    const mockClient = {
      graphql: vi.fn(async ({ query }) => {
        const q = typeof query === 'string' ? query : (query && query.loc && query.loc.source && query.loc.source.body) || '';
        if (q.includes('getUserByCognito')) return { data: { getUserByCognito: { id: 'u1', cognitoId: 'c1', email: 'u1@example.com', role: 'boss', restaurantId: 'r1' } } };
        if (q.includes('getRestaurant')) return { data: { getRestaurant: { id: 'r1', name: 'R name', address: '', phone: '' } } };
        return { data: {} };
      }),
    };
    setRestaurantApiClient(mockClient);
    setUserApiClient(mockClient);

    window.history.pushState({}, 'Test page', '/');
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    // wait for the Restaurant Info link to appear in the DOM (allow hidden in case submenu is collapsed)
    const restaurantLink = await screen.findByRole('link', { name: /restaurant info/i, hidden: true });
    await userEvent.click(restaurantLink);

    // The restaurant name is rendered as the input value — assert by display value
    await screen.findByDisplayValue(/r name/i);
  });
});
