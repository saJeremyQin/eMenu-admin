import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { generateClient } from 'aws-amplify/api';

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

// Thunks
export const fetchDishTypes = createAsyncThunk(
  'dishTypes/fetchDishTypes',
  async (_, thunkAPI) => {
    try {
      const query = /* GraphQL */ `
        query ListDishTypes {
          listDishTypes {
            id
            name
            alias
            isActive
            sortOrder
            createdAt
          }
        }
      `;
      const resp = await getApiClient().graphql({ query });
      const raw = resp?.data?.listDishTypes || [];
      if (!Array.isArray(raw)) return [];

      // Defensive: filter out null entries and ensure non-nullable fields exist.
      const cleaned = raw
        .filter((it) => !!it)
        .map((it) => {
          // createdAt is non-nullable in our schema. If backend returned null for some
          // items (causing AppSync GraphQL errors), synthesize a fallback timestamp so
          // the client doesn't crash. Also log a warning for backend investigation.
          if (it.createdAt == null) {
            // eslint-disable-next-line no-console
            console.warn(`dishType ${it.id || '<unknown>'} missing createdAt; synthesizing timestamp`);
            return { ...it, createdAt: new Date().toISOString() };
          }
          return it;
        });

      return cleaned;
    } catch (e) {
      return thunkAPI.rejectWithValue(e.message || 'Failed to fetch dish types');
    }
  }
);

export const createDishType = createAsyncThunk(
  'dishTypes/createDishType',
  async (input, thunkAPI) => {
    try {
      const mutation = /* GraphQL */ `
        mutation CreateDishType($input: DishTypeInput!) {
          createDishType(input: $input) {
            id
            name
            alias
            isActive
            sortOrder
            createdAt
          }
        }
      `;
      const resp = await getApiClient().graphql({ query: mutation, variables: { input } });
      return resp?.data?.createDishType;
    } catch (e) {
      return thunkAPI.rejectWithValue(e.message || 'Failed to create dish type');
    }
  }
);

export const updateDishType = createAsyncThunk(
  'dishTypes/updateDishType',
  async ({ id, input }, thunkAPI) => {
    try {
      const mutation = /* GraphQL */ `
        mutation UpdateDishType($id: ID!, $input: DishTypeInput!) {
          updateDishType(id: $id, input: $input) {
            id
            name
            alias
            isActive
            sortOrder
            updatedAt
          }
        }
      `;
      const resp = await getApiClient().graphql({ query: mutation, variables: { id, input } });
      return resp?.data?.updateDishType;
    } catch (e) {
      return thunkAPI.rejectWithValue(e.message || 'Failed to update dish type');
    }
  }
);

export const deleteDishType = createAsyncThunk(
  'dishTypes/deleteDishType',
  async (id, thunkAPI) => {
    try {
      const mutation = /* GraphQL */ `
        mutation DeleteDishType($id: ID!) {
          deleteDishType(id: $id) { id }
        }
      `;
      const resp = await getApiClient().graphql({ query: mutation, variables: { id } });
      return resp?.data?.deleteDishType;
    } catch (e) {
      return thunkAPI.rejectWithValue(e.message || 'Failed to delete dish type');
    }
  }
);

export const toggleDishTypeStatus = createAsyncThunk(
  'dishTypes/toggleDishTypeStatus',
  async ({ id, isActive }, thunkAPI) => {
    try {
      const mutation = /* GraphQL */ `
        mutation ToggleDishTypeStatus($id: ID!, $isActive: Boolean!) {
          toggleDishTypeStatus(id: $id, isActive: $isActive) {
            id
            isActive
            updatedAt
          }
        }
      `;
      const resp = await getApiClient().graphql({ query: mutation, variables: { id, isActive } });
      return resp?.data?.toggleDishTypeStatus;
    } catch (e) {
      return thunkAPI.rejectWithValue(e.message || 'Failed to toggle dish type status');
    }
  }
);

const initialState = {
  entities: {}, // id -> dishType
  ids: [], // ordered ids
  loading: false,
  loaded: false,
  error: null,
};

const slice = createSlice({
  name: 'dishTypes',
  initialState,
  reducers: {
    // local-only updates (useful for optimistic UI)
    addDishTypeLocal(state, action) {
      const dt = action.payload;
      state.entities[dt.id] = dt;
      if (!state.ids.includes(dt.id)) state.ids.push(dt.id);
    },
    updateDishTypeLocal(state, action) {
      const dt = action.payload;
      if (state.entities[dt.id]) {
        state.entities[dt.id] = { ...state.entities[dt.id], ...dt };
      }
    },
    removeDishTypeLocal(state, action) {
      const id = action.payload;
      delete state.entities[id];
      state.ids = state.ids.filter((i) => i !== id);
    },
    clearDishTypes(state) {
      state.entities = {};
      state.ids = [];
      state.loading = false;
      state.loaded = false;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDishTypes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDishTypes.fulfilled, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.error = null;
        const list = action.payload || [];
        // normalize
        state.entities = {};
        state.ids = [];
        // sort by sortOrder then name
        list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.name || '').localeCompare(b.name || ''));
        for (const dt of list) {
          state.entities[dt.id] = dt;
          state.ids.push(dt.id);
        }
      })
      .addCase(fetchDishTypes.rejected, (state, action) => {
        state.loading = false;
        state.loaded = true; // finished attempt
        state.error = action.payload || action.error?.message || 'Failed to fetch dish types';
      })
      .addCase(createDishType.fulfilled, (state, action) => {
        const dt = action.payload;
        if (!dt) return;
        state.entities[dt.id] = dt;
        if (!state.ids.includes(dt.id)) state.ids.push(dt.id);
      })
      .addCase(updateDishType.fulfilled, (state, action) => {
        const dt = action.payload;
        if (!dt) return;
        state.entities[dt.id] = { ...state.entities[dt.id], ...dt };
      })
      .addCase(deleteDishType.fulfilled, (state, action) => {
        const dt = action.payload;
        if (!dt || !dt.id) return;
        delete state.entities[dt.id];
        state.ids = state.ids.filter((i) => i !== dt.id);
      })
      .addCase(toggleDishTypeStatus.fulfilled, (state, action) => {
        const dt = action.payload;
        if (!dt || !dt.id) return;
        if (state.entities[dt.id]) {
          state.entities[dt.id].isActive = dt.isActive;
          state.entities[dt.id].updatedAt = dt.updatedAt;
        }
      });
  }
});

export const { addDishTypeLocal, updateDishTypeLocal, removeDishTypeLocal, clearDishTypes } = slice.actions;
export default slice.reducer;

// Selectors
export const selectDishTypeState = (state) => state.dishTypes;
export const selectDishTypeEntities = createSelector([selectDishTypeState], (s) => s.entities);
export const selectDishTypeIds = createSelector([selectDishTypeState], (s) => s.ids);
export const selectDishTypesLoading = createSelector([selectDishTypeState], (s) => s.loading);
export const selectDishTypesLoaded = createSelector([selectDishTypeState], (s) => s.loaded);
export const selectDishTypeError = createSelector([selectDishTypeState], (s) => s.error);

export const selectAllDishTypes = createSelector(
  [selectDishTypeEntities, selectDishTypeIds],
  (entities, ids) => ids.map((id) => entities[id])
);

export const selectDishTypeById = (state, id) => state.dishTypes.entities[id] || null;

export const selectDishTypeOptions = createSelector([selectAllDishTypes], (list) =>
  list.map((t) => ({ value: t.id, label: t.name }))
);
