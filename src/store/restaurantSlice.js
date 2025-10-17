import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { generateClient } from 'aws-amplify/api';

const client = generateClient();

export const fetchRestaurant = createAsyncThunk(
  'restaurant/fetchRestaurant',
  async (_, thunkAPI) => {
    try {
      const query = /* GraphQL */ `
        query GetRestaurant {
          getRestaurant {
            id
            name
            address
            phone
            image
            subscriptionPlan
            subscriptionExpiry
          }
        }
      `;
      const resp = await client.graphql({ query });
      return resp?.data?.getRestaurant || null;
    } catch (e) {
      return thunkAPI.rejectWithValue(e.message || 'Failed to fetch restaurant');
    }
  }
);

const initialState = {
  id: null,
  name: null,
  address: null,
  phone: null,
  image: null,
  subscriptionPlan: null,
  subscriptionExpiry: null,
};

const restaurantSlice = createSlice({
  name: 'restaurant',
  initialState,
  reducers: {
    setRestaurant(state, action) {
      // mutate draft state
      const payload = action.payload || {};
      state.id = payload.id ?? state.id;
      state.name = payload.name ?? state.name;
      state.address = payload.address ?? state.address;
      state.phone = payload.phone ?? state.phone;
      state.image = payload.image ?? state.image;
      state.subscriptionPlan = payload.subscriptionPlan ?? state.subscriptionPlan;
      state.subscriptionExpiry = payload.subscriptionExpiry ?? state.subscriptionExpiry;
    },
    clearRestaurant() {
      // reset to initial state by mutating fields
      return initialState;
    },
    updateRestaurantField(state, action) {
      const { key, value } = action.payload;
      state[key] = value;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRestaurant.fulfilled, (state, action) => {
        if (action.payload) {
          const p = action.payload;
          state.id = p.id ?? state.id;
          state.name = p.name ?? state.name;
          state.address = p.address ?? state.address;
          state.phone = p.phone ?? state.phone;
          state.image = p.image ?? state.image;
          state.subscriptionPlan = p.subscriptionPlan ?? state.subscriptionPlan;
          state.subscriptionExpiry = p.subscriptionExpiry ?? state.subscriptionExpiry;
        }
      })
      .addCase(fetchRestaurant.rejected, (state, action) => {
        // keep state unchanged on error
      });
  }
});

export const { setRestaurant, clearRestaurant, updateRestaurantField } = restaurantSlice.actions;
export default restaurantSlice.reducer;

// selectors
export const selectRestaurant = (state) => state.restaurant;
export const selectRestaurantName = createSelector([selectRestaurant], (r) => r?.name);
export const selectHasRestaurant = createSelector([selectRestaurant], (r) => !!r?.id);
