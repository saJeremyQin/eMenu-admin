import { describe, it, expect, vi, beforeEach } from 'vitest';
// Use a global mock to avoid hoisting/TDZ issues when vi.mock is hoisted.
// Mock only the API module by injecting client via setApiClient in tests.
vi.mock('aws-amplify/api', () => ({
  generateClient: () => ({ graphql: () => { throw new Error('generateClient should not be used in tests; inject with setApiClient') } })
}));

import restaurantReducer, { setRestaurant, clearRestaurant, updateRestaurantField, fetchRestaurant, setApiClient } from '../../store/restaurantSlice';

describe('restaurantSlice reducers', () => {
  it('setRestaurant sets fields', () => {
    const initial = undefined; // uses initialState
    const action = setRestaurant({ id: 'r1', name: 'R', address: 'A' });
    const next = restaurantReducer(initial, action);
    expect(next.id).toBe('r1');
    expect(next.name).toBe('R');
    expect(next.address).toBe('A');
  });

  it('clearRestaurant resets to initialState', () => {
    const state = { id: 'r1', name: 'R', loaded: true };
    const next = restaurantReducer(state, clearRestaurant());
    expect(next).toEqual({
      id: null,
      name: null,
      address: null,
      phone: null,
      image: null,
      subscriptionPlan: null,
      subscriptionExpiry: null,
      loading: false,
      loaded: false,
      error: null,
    });
  });

  it('updateRestaurantField updates a key', () => {
    const state = { id: 'r1', name: 'Old' };
    const next = restaurantReducer(state, updateRestaurantField({ key: 'name', value: 'New' }));
    expect(next.name).toBe('New');
  });
});

describe('fetchRestaurant thunk', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fulfilled when graphql returns restaurant', async () => {
  const mockClient = { graphql: vi.fn().mockResolvedValue({ data: { getRestaurant: { id: 'r1', name: 'R' } } }) };
  setApiClient(mockClient);
  const dispatch = vi.fn();
  const thunk = fetchRestaurant();
  const result = await thunk(dispatch, () => ({}), undefined);
    expect(result.type).toBe('restaurant/fetchRestaurant/fulfilled');
    expect(result.payload).toEqual({ id: 'r1', name: 'R' });
  });

  it('rejected when graphql throws', async () => {
  const mockClient = { graphql: vi.fn().mockRejectedValue(new Error('network')) };
  setApiClient(mockClient);
  const dispatch = vi.fn();
  const thunk = fetchRestaurant();
  const result = await thunk(dispatch, () => ({}), undefined);
    expect(result.type).toBe('restaurant/fetchRestaurant/rejected');
    expect(result.payload).toBe('network');
  });
});
