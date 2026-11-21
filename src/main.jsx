// src/main.jsx
// Must be the first import: configures Amplify before App, pages and the store load.
import './amplify-setup.js';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { Provider } from 'react-redux';
import '@aws-amplify/ui-react/styles.css';

import store from './store/store';

// **Import new global SCSS file**
import './assets/styles/main.scss'; // <-- 关键修改

// 配 (done above)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
);