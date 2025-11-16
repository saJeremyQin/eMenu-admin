import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit";
import { generateClient } from "aws-amplify/api";

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

// Normalize dish input to match server-side `DishInput` shape.
// We standardize on `imageUrl` for Dish images, but accept legacy `image` for compatibility.
function buildDishInput(dishData) {
  return {
    dishTypeId: dishData.dishTypeId,
    name: dishData.name,
    price: dishData.price,
    // prefer explicit imageUrl, fall back to legacy `image`
    imageUrl: dishData.imageUrl || dishData.image || null,
    description: dishData.description,
    sortOrder: dishData.sortOrder,
    isActive: dishData.isActive,
  };
}

// Thunks
export const fetchDishes = createAsyncThunk(
  "dishes/fetchDishes",
  async (_, thunkAPI) => {
    try {
      const query = /* GraphQL */ `
        query ListDishes {
          listDishes {
            id      
            name
            description
            price
            isActive
            imageUrl
            createdAt
            dishType {
              id
              name
              alias
            }
            updatedAt
          }
        }
      `;
      const resp = await getApiClient().graphql({ query });
      const raw = resp?.data?.listDishes || [];
      if (!Array.isArray(raw)) return [];

      const cleaned = raw
        .filter((it) => !!it)
        .map((it) => {
          if (it.createdAt == null) {
            console.warn(`dish ${it.id || "<unknown>"} missing createdAt; synthesizing timestamp`);
            return { ...it, createdAt: new Date().toISOString() };
          }
          return it;
        });

      return cleaned;
    } catch (e) {
      return thunkAPI.rejectWithValue(e.message || "Failed to fetch dishes");
    }
  }
);

export const createDish = createAsyncThunk(
  "dishes/createDish",
  async (dishData, thunkAPI) => {
    try {
      const mutation = /* GraphQL */ `
        mutation CreateDish($input: DishInput!) {
          createDish(input: $input) {
            id
            name
            description
            price
            isActive
            imageUrl
            dishType {
              id
              name
            }
            createdAt
          }
        }
      `;
      // Build an input object that matches the server-side `DishInput` exactly.
      // We standardize on `imageUrl` for dishes; keep fallback for legacy `image`.
      const inputPayload = buildDishInput(dishData);
      console.log('inputPayload is', inputPayload);
      

      const resp = await getApiClient().graphql({ query: mutation, variables: { input: inputPayload } });
      if (resp?.errors && resp.errors.length) {
        // Log full GraphQL response for debugging in dev so callers can inspect exact error objects
        // (This helps diagnose AppSync resolver errors such as auth, missing restaurant, or invalid DishType)
        // eslint-disable-next-line no-console
        console.error('createDish GraphQL response with errors:', resp);
        const msg = resp.errors[0]?.message || 'GraphQL error';
        return thunkAPI.rejectWithValue(msg);
      }
      return resp?.data?.createDish || null;
    } catch (e) {
      return thunkAPI.rejectWithValue(e.message || "Failed to create dish");
    }
  }
);

export const updateDish = createAsyncThunk(
  "dishes/updateDish",
  async ({ id, dishData }, thunkAPI) => {
    try {
      const mutation = /* GraphQL */ `
        mutation UpdateDish($id: ID!, $input: DishInput!) {
          updateDish(id: $id, input: $input) {
            id
            name
            description
            price
            isActive
            dishType {
              id
              name
            }
            updatedAt
          }
        }
      `;
      // Normalize update payload to match server-side `DishInput` shape
      const inputPayload = buildDishInput(dishData);

      const resp = await getApiClient().graphql({ query: mutation, variables: { id, input: inputPayload } });
      if (resp?.errors && resp.errors.length) {
        return thunkAPI.rejectWithValue(resp.errors[0]?.message || 'GraphQL error');
      }
      return resp?.data?.updateDish || null;
    } catch (e) {
      return thunkAPI.rejectWithValue(e.message || "Failed to update dish");
    }
  }
);

export const deleteDish = createAsyncThunk(
  "dishes/deleteDish",
  async (id, thunkAPI) => {
    try {
      const mutation = /* GraphQL */ `
        mutation DeleteDish($id: ID!) {
          deleteDish(id: $id) {
            id
          }
        }
      `;
      const resp = await getApiClient().graphql({ query: mutation, variables: { id } });
      if (resp?.errors && resp.errors.length) {
        return thunkAPI.rejectWithValue(resp.errors[0]?.message || 'GraphQL error');
      }
      return resp?.data?.deleteDish || null;
    } catch (e) {
      return thunkAPI.rejectWithValue(e.message || "Failed to delete dish");
    }
  }
);

export const toggleDishStatus = createAsyncThunk(
  "dishes/toggleDishStatus",
  async ({ id, isActive }, thunkAPI) => {
    try {
      const mutation = /* GraphQL */ `
        mutation ToggleDishStatus($id: ID!, $isActive: Boolean!) {
          toggleDishStatus(id: $id, isActive: $isActive) {
            id
            isActive
            updatedAt
          }
        }
      `;
      const resp = await getApiClient().graphql({ query: mutation, variables: { id, isActive } });
      if (resp?.errors && resp.errors.length) {
        return thunkAPI.rejectWithValue(resp.errors[0]?.message || 'GraphQL error');
      }
      return resp?.data?.toggleDishStatus || null;
    } catch (e) {
      return thunkAPI.rejectWithValue(e.message || "Failed to toggle dish status");
    }
  }
);
    
const initialState = {
  entities: {},
  ids: [],
  loading: false,
  loaded: false,
  error: null,
}
// Slice

const dishSlice = createSlice({
  name: "dishes",
  initialState,
  reducers: {
    updateDishLocal(state, action) {
      const { id, ...changes } = action.payload;
      if (state.entities[id]) {
        state.entities[id] = { ...state.entities[id], ...changes };
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDishes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDishes.fulfilled, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.error = null;
        const dishes = action.payload || [];
        const entities = {};
        const ids = [];
        dishes.forEach((dish) => {
          entities[dish.id] = dish;
          ids.push(dish.id);
        });
        state.entities = entities;
        state.ids = ids;
      })
      .addCase(fetchDishes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch dishes";
      })
      .addCase(createDish.fulfilled, (state, action) => {
        const dish = action.payload;
        if (dish) {
          state.entities[dish.id] = dish;
          if (!state.ids.includes(dish.id)) {
            state.ids.push(dish.id);
          }
        }
      })
      .addCase(updateDish.fulfilled, (state, action) => {
        const dish = action.payload;
        if (dish && state.entities[dish.id]) {
          state.entities[dish.id] = { ...state.entities[dish.id], ...dish };
        }
      })
      .addCase(deleteDish.fulfilled, (state, action) => {
        const dish = action.payload;
        if (dish && state.entities[dish.id]) {
          delete state.entities[dish.id];
          state.ids = state.ids.filter((id) => id !== dish.id);
        }
      })
      .addCase(toggleDishStatus.fulfilled, (state, action) => {
        const dish = action.payload;
        if (dish && state.entities[dish.id]) {
          state.entities[dish.id].isActive = dish.isActive;
          state.entities[dish.id].updatedAt = dish.updatedAt;
        }
      });
  },
});

export const { updateDishLocal } = dishSlice.actions;
export default dishSlice.reducer;

export const selectDishesState = (state) => state.dishes;

export const selectAllDishes = createSelector(
  selectDishesState,
  (dishesState) => dishesState.ids.map((id) => dishesState.entities[id])
);        

export const selectDishById = (state, dishId) => {
  const dishesState = selectDishesState(state);
  return dishesState.entities[dishId] || null;
};

export const selectDishesLoading = createSelector(
  selectDishesState,
  (dishesState) => dishesState.loading
);

export const selectDishesLoaded = createSelector(
  selectDishesState,
  (dishesState) => dishesState.loaded
);

// Additional selectors for parity with dishTypeSlice
export const selectDishEntities = createSelector(
  selectDishesState,
  (s) => s.entities
);

export const selectDishIds = createSelector(
  selectDishesState,
  (s) => s.ids
);

export const selectDishesError = createSelector(
  selectDishesState,
  (s) => s.error
);

export const selectDishOptions = createSelector(
  selectAllDishes,
  (list) => list.map((d) => ({ value: d.id, label: d.name }))
);

// factory selector to filter dishes by dishTypeId
export const makeSelectDishesByType = () =>
  createSelector([
    selectAllDishes,
    (_, dishTypeId) => dishTypeId,
  ], (list, dishTypeId) => list.filter((d) => d.dishTypeId === dishTypeId));

export const selectDishCount = createSelector(
  selectDishIds,
  (ids) => ids?.length || 0
);