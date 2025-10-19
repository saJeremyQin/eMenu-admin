import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';

// lazy API client so tests can inject a mock via `setApiClient`.
let __apiClient = null;
export function setApiClient(client) {
  __apiClient = client;
}
function getApiClient() {
  if (!__apiClient) {
    __apiClient = generateClient();
  }
  return __apiClient;
}

export const fetchUser = createAsyncThunk(
  'user/fetchUser',
  async (_, thunkAPI) => {
    try {
      const current = await getCurrentUser();
      const userId = current?.userId || current?.username || current?.attributes?.sub;
        const cognitoSub = userId;
        const query = /* GraphQL */ `
          query GetUserByCognito($cid: ID!) {
            getUserByCognito(cid: $cid) {
              id
              cognitoId
              email
              role
              restaurantId
            }
          }
        `;
  const resp = await getApiClient().graphql({ query, variables: { cid: cognitoSub } });
        return resp?.data?.getUserByCognito || null;
    } catch (e) {
      return thunkAPI.rejectWithValue(e.message || 'Failed to fetch user');
    }
  }
);

const initialState = {
  id: null,
  cognitoId: null,
  email: null,
  role: null,
  restaurantId: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser(state, action) {
      const payload = action.payload || {};
      state.id = payload.id ?? state.id;
      state.cognitoId = payload.cognitoId ?? state.cognitoId;
      state.email = payload.email ?? state.email;
      state.role = payload.role ?? state.role;
      state.restaurantId = payload.restaurantId ?? state.restaurantId;
      state.isAuthenticated = true;
      state.error = null;
    },
    clearUser(state) {
      state.id = null;
      state.cognitoId = null;
      state.email = null;
      state.role = null;
      state.restaurantId = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
    updateUserField(state, action) {
      const { key, value } = action.payload;
      state[key] = value;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        if (action.payload) {
          // mutate draft state instead of returning a new object to satisfy Immer
          state.id = action.payload.id ?? state.id;
          state.cognitoId = action.payload.cognitoId ?? state.cognitoId;
          state.email = action.payload.email ?? state.email;
          state.role = action.payload.role ?? state.role;
          state.restaurantId = action.payload.restaurantId ?? state.restaurantId;
          state.isAuthenticated = true;
        }
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message;
      });
  }
});

export const { setUser, clearUser, updateUserField } = userSlice.actions;
export default userSlice.reducer;

// Selectors
export const selectUser = (state) => state.user;
export const selectUserId = createSelector([selectUser], (u) => u?.id);
export const selectRestaurantId = createSelector([selectUser], (u) => u?.restaurantId);
export const selectIsAuthenticated = createSelector([selectUser], (u) => !!u?.isAuthenticated);
export const selectUserLoading = createSelector(selectUser, (u) => u.loading);
