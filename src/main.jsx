// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { Provider } from 'react-redux';

// 导入 Amplify 库和 Amplify UI React 的样式
import { Amplify } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';

// 从单独的文件导入 AWS 配置
import awsOutputs from './aws-config.js'; // 假设 aws-config.js 存在且导出配置

// Configure Amplify BEFORE importing the store so any modules that use Amplify
// during store initialization (or thunks executed synchronously) won't trigger
// the "Amplify has not been configured" warning.
Amplify.configure(awsOutputs);
console.log('Amplify configured');

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