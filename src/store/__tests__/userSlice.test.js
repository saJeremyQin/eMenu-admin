import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock only the auth module; we'll inject a mock API client via setApiClient.
vi.mock('aws-amplify/auth', () => ({
  getCurrentUser: vi.fn(),
}));

import userReducer, { setUser, clearUser, updateUserField, fetchUser, setApiClient } from '../userSlice';
import { getCurrentUser } from 'aws-amplify/auth';

describe('userSlice reducers', () => {
  it('setUser should set the user and mark authenticated', () => {
    const initial = undefined; // reducer uses initialState when undefined
    const action = setUser({ id: 'u1', cognitoId: 'c1', email: 'a@b.com', role: 'boss', restaurantId: 'r1' });
    const next = userReducer(initial, action);
    expect(next.id).toBe('u1');
    expect(next.isAuthenticated).toBe(true);
    expect(next.email).toBe('a@b.com');
  });

  it('clearUser resets the state', () => {
    const state = {
      id: 'u1', cognitoId: 'c1', email: 'a@b.com', role: 'boss', restaurantId: 'r1', isAuthenticated: true, loading: false, error: null
    };
    const next = userReducer(state, clearUser());
    expect(next.id).toBeNull();
    expect(next.isAuthenticated).toBe(false);
    expect(next.loading).toBe(false);
  });

  it('updateUserField updates a specific key', () => {
    const state = { id: 'u1', email: 'old@example.com' };
    const next = userReducer(state, updateUserField({ key: 'email', value: 'new@example.com' }));
    expect(next.email).toBe('new@example.com');
  });
});

describe('fetchUser thunk', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fulfilled when getCurrentUser and graphql return user', async () => {
    // inject a mock API client
    const mockClient = { graphql: vi.fn().mockResolvedValue({ data: { getUserByCognito: { id: 'u1', cognitoId: 'c1', email: 'a@b.com', role: 'boss' } } }) };
    setApiClient(mockClient);
    getCurrentUser.mockResolvedValue({ userId: 'c1' });

    const dispatch = vi.fn();
    const thunk = fetchUser();
    const result = await thunk(dispatch, () => ({}), undefined);

    // result should be returned payload (unwrapped) if success
    // 断言返回的值是您 Thunk 内部 return 的对象 (getUserByCognito)
    expect(result.payload).toEqual({ 
        id: 'u1', 
        cognitoId: 'c1', 
        email: 'a@b.com', 
        role: 'boss' 
    });
    // 还可以断言 Thunk 状态是否正确
    expect(result.type).toBe('user/fetchUser/fulfilled');
  });
});


describe('reducers edge cases', () => {
  afterEach(() => {
    // avoid test pollution if setApiClient used elsewhere
    try { setApiClient(null); } catch (e) {}
    vi.resetAllMocks();
  });

  it('setUser with empty payload keeps existing fields and still marks authenticated', () => {
    const state = {
      id: 'u1', cognitoId: 'c1', email: 'a@b.com', role: 'boss', restaurantId: 'r1', isAuthenticated: false
    };
    const next = userReducer(state, setUser());
    expect(next.id).toBe('u1');
    expect(next.email).toBe('a@b.com');
    expect(next.isAuthenticated).toBe(true);
  });

  it('setUser with partial payload updates only provided fields', () => {
    const state = { id: 'u1', email: 'old@example.com', role: 'user', isAuthenticated: false };
    const next = userReducer(state, setUser({ email: 'new@example.com' }));
    expect(next.id).toBe('u1');
    expect(next.email).toBe('new@example.com');
    expect(next.role).toBe('user');
    expect(next.isAuthenticated).toBe(true);
  });

  it('handles pending -> fulfilled flow', () => {
    let state = userReducer(undefined, { type: '@@INIT' });
    state = userReducer(state, { type: fetchUser.pending.type });
    expect(state.loading).toBe(true);
    state = userReducer(state, { type: fetchUser.fulfilled.type, payload: { id: 'u1', cognitoId: 'c1', email: 'a@b.com', role: 'boss' } });
    expect(state.loading).toBe(false);
    expect(state.id).toBe('u1');
    expect(state.isAuthenticated).toBe(true);
  });

  it('handles pending -> rejected with payload or error.message', () => {
    let state = userReducer(undefined, { type: '@@INIT' });
    state = userReducer(state, { type: fetchUser.pending.type });
    state = userReducer(state, { type: fetchUser.rejected.type, payload: 'network-failure', error: {} });
    expect(state.loading).toBe(false);
    expect(state.error).toBe('network-failure');

    state = userReducer(undefined, { type: '@@INIT' });
    state = userReducer(state, { type: fetchUser.pending.type });
    state = userReducer(state, { type: fetchUser.rejected.type, payload: undefined, error: { message: 'timeout' } });
    expect(state.loading).toBe(false);
    expect(state.error).toBe('timeout');
  });
});