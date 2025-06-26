// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react'; // 假设您已经安装并配置了 Amplify

import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage/HomePage';

function App() {
  return (
    <Router>
      <Authenticator.Provider> {/* Amplify Authenticator Provider */}
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            {/* 登录/注册页面 */}
            <Route path="/auth" element={<Authenticator />} />
            {/* 其他路由 */}
            {/* <Route path="/menu-items" element={<MenuItemsPage />} /> */}
          </Routes>
        </Layout>
      </Authenticator.Provider>
    </Router>
  );
}

export default App;