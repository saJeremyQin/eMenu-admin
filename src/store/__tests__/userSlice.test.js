import { describe, it, expect, vi, beforeEach } from 'vitest';
import userReducer, { setUser, clearUser, updateUserField, fetchUser } from '../userSlice';

// Mock aws-amplify modules
vi.mock('aws-amplify/api', () => ({
  generateClient: () => ({
    graphql: vi.fn(),
  }),
}));
vi.mock('aws-amplify/auth', () => ({
  getCurrentUser: vi.fn(),
}));

import { generateClient } from 'aws-amplify/api';
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
    const mockClient = generateClient();
    mockClient.graphql.mockResolvedValue({ data: { getUserByCognito: { id: 'u1', cognitoId: 'c1', email: 'a@b.com', role: 'boss' } } });
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
