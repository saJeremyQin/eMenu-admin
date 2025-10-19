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

describe('reducers edge cases', () => {
  afterEach(() => {
    // reset injected client to avoid test pollution
    try { setApiClient(null); } catch (e) {}
    vi.resetAllMocks();
  });

  it('setRestaurant with empty payload keeps existing fields', () => {
    const state = { id: 'r1', name: 'R', address: 'A', loaded: true };
    const next = restaurantReducer(state, setRestaurant());
    expect(next.id).toBe('r1');
    expect(next.name).toBe('R');
    // setRestaurant with undefined payload should not clear fields
    expect(next.loaded).toBe(true);
  });

  it('setRestaurant with partial payload updates only provided fields', () => {
    const state = { id: 'r1', name: 'Old', address: 'OldAddr' };
    const next = restaurantReducer(state, setRestaurant({ name: 'New' }));
    expect(next.id).toBe('r1');
    expect(next.name).toBe('New');
    expect(next.address).toBe('OldAddr');
  });

  it('handles pending -> fulfilled flow', () => {
    let state = restaurantReducer(undefined, { type: '@@INIT' });
    state = restaurantReducer(state, { type: fetchRestaurant.pending.type });
    expect(state.loading).toBe(true);

    state = restaurantReducer(state, { type: fetchRestaurant.fulfilled.type, payload: { id: 'r1', name: 'R' } });
    expect(state.loading).toBe(false);
    expect(state.loaded).toBe(true);
    expect(state.id).toBe('r1');
  });

  it('handles pending -> rejected flow (payload or error.message)', () => {
    let state = restaurantReducer(undefined, { type: '@@INIT' });
    state = restaurantReducer(state, { type: fetchRestaurant.pending.type });
    state = restaurantReducer(state, { type: fetchRestaurant.rejected.type, payload: 'no-network', error: {} });
    expect(state.loading).toBe(false);
    expect(state.loaded).toBe(true);
    expect(state.error).toBe('no-network');

    state = restaurantReducer(undefined, { type: '@@INIT' });
    state = restaurantReducer(state, { type: fetchRestaurant.pending.type });
    state = restaurantReducer(state, { type: fetchRestaurant.rejected.type, payload: undefined, error: { message: 'timeout' } });
    expect(state.loading).toBe(false);
    expect(state.loaded).toBe(true);
    expect(state.error).toBe('timeout');
  });
});
