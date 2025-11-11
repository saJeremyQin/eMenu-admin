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
            dishTypeId
            createdAt
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
            dishTypeId
            createdAt
          }
        }
      `;
      const resp = await getApiClient().graphql({ query: mutation, variables: { input: dishData } });
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
            dishTypeId
            updatedAt
          }
        }
      `;
      const resp = await getApiClient().graphql({ query: mutation, variables: { id, input: dishData } });
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