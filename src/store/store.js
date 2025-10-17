import { configureStore } from '@reduxjs/toolkit';
import userReducer from './userSlice';
import restaurantReducer from './restaurantSlice';
import { fetchUser } from './userSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    restaurant: restaurantReducer,
  },
});

// Expose the store on window for easier debugging in dev mode
if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-undef
  window.__APP_STORE__ = store;
  // helper to re-dispatch fetchUser from the console for debugging
  // usage: __FETCH_USER__().then(r => console.log('fetchUser result', r)).catch(e => console.error(e))
  // eslint-disable-next-line no-unused-vars
  window.__FETCH_USER__ = async () => {
    try {
      const res = await store.dispatch(fetchUser()).unwrap();
      console.log('fetchUser success', res);
      return res;
    } catch (err) {
      console.error('fetchUser failed', err);
      throw err;
    }
  };
}

export default store;
