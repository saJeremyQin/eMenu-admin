// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// 导入 Amplify 库和 Amplify UI React 的样式
import { Amplify } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';

// 从单独的文件导入 AWS 配置
import awsOutputs from './aws-config.js'; // 假设 aws-config.js 存在且导出配置

// **导入新的全局 SCSS 文件**
import './assets/styles/main.scss'; // <-- 关键修改

// 配置 Amplify
Amplify.configure(awsOutputs);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);