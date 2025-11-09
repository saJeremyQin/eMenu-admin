import { configureStore } from '@reduxjs/toolkit';
import userReducer from './userSlice';
import restaurantReducer from './restaurantSlice';
import dishTypeReducer from './dishTypeSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    restaurant: restaurantReducer,
    dishTypes: dishTypeReducer,
  },
});

export default store;
