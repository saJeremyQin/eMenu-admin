import { configureStore } from '@reduxjs/toolkit';
import userReducer from './userSlice';
import restaurantReducer from './restaurantSlice';
import dishTypeReducer from './dishTypeSlice';
import dishReducer from './dishSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    restaurant: restaurantReducer,
    dishTypes: dishTypeReducer,
    dishes: dishReducer,
  },
});

export default store;
