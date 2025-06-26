// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react'; // 假设您已经安装并配置了 Amplify
import '@aws-amplify/ui-react/styles.css'; // Amplify UI 的基础样式

import LayoutLogin from './components/LayoutLogin/LayoutLogin';
import LayoutStandard from './components/LayoutStandard/LayoutStandard'; // 原 Layout 重命名

import HomePage from './pages/HomePage/HomePage';
import DishManagerPage from './pages/DishManagerPage/DishManagerPage';

const AuthLayoutManager = () => {
  const { authStatus } = useAuthenticator(context => [context.authStatus]);

  // 根据认证状态选择渲染的布局
  const isAuthenticated = authStatus === 'authenticated';

  return (
    <> {/* 使用 React Fragment 包裹，因为这里是子组件的根 */}
      {isAuthenticated ? (
        // 已登录用户看到的布局
        <LayoutStandard>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dishes" element={<DishManagerPage />} />
            {/* <Route path="/dish-types" element={<DishTypesPage />} /> */}
            {/* <Route path="/restaurants" element={<RestaurantsPage />} /> */}
            {/* <Route path="/settings" element={<SettingsPage />} /> */}
            {/* 如果用户已登录，再次访问 /auth 应该重定向或显示主页 */}
            <Route path="/auth" element={<HomePage />} />
          </Routes>
        </LayoutStandard>
      ) : (
        // 未登录用户看到的布局
        <LayoutLogin>
          <Routes>
            {/* 登录/注册页面通常是 /auth，但也可以是 / 或其他 */}
            <Route path="/" element={<LayoutLogin />} /> {/* 确保根路径也显示登录布局 */}
            <Route path="/auth" element={<LayoutLogin />} />
            {/* 其他未认证可访问的公开页面 */}
          </Routes>
        </LayoutLogin>
      )}
    </>
  );
};

function App() {
  // 确保所有样式文件都已在 main.jsx 中导入，或者在 App.jsx 中通过 <style> 标签注入
  // 最佳实践是在 main.jsx 中导入所有 SCSS 文件
  return (
    <Router>
      <Authenticator.Provider> {/* Provider 放在这里，作为 AuthLayoutManager 的父级 */}
        <AuthLayoutManager /> {/* 在 Provider 内部渲染管理布局的组件 */}
      </Authenticator.Provider>
    </Router>
  );
}

export default App;