    // src/main.jsx (或 index.jsx)
    import React from 'react';
    import ReactDOM from 'react-dom/client';
    import App from './App.jsx'; // 注意 .jsx 扩展名

    // 导入 Amplify 库和 Amplify UI React 的样式
    import { Amplify } from 'aws-amplify';
    import '@aws-amplify/ui-react/styles.css'; // 注意：这里是 @aws-amplify/ui-react

    // 从单独的文件导入 AWS 配置
    import awsOutputs from './aws-config.js'; // 注意 .js 扩展名

    // 配置 Amplify
    Amplify.configure(awsOutputs);

    // 渲染 React 应用
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    