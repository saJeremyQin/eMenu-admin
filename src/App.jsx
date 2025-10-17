// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react'; // this includes hostedui and auth
import '@aws-amplify/ui-react/styles.css'; // Amplify UI 的基础样式

import LayoutLogin from './components/LayoutLogin/LayoutLogin';
import LayoutStandard from './components/LayoutStandard/LayoutStandard'; // 原 Layout 重命名
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUser } from './store/userSlice';
import { fetchRestaurant, selectHasRestaurant } from './store/restaurantSlice';
import { useNavigate } from 'react-router-dom';

import HomePage from './pages/HomePage/HomePage';
import DishManagerPage from './pages/DishManagerPage/DishManagerPage';
import CreateRestaurant from './pages/CreateRestaurant/CreateRestaurant';
import RestaurantInfo from './pages/RestaurantInfo/RestaurantInfo';
import SubscriptionPlan from './pages/SubscriptionPlan/SubscriptionPlan';
import RestaurantGuard from './components/guards/RestaurantGuard';
import NoRestaurantGuard from './components/guards/NoRestaurantGuard';

const AuthLayoutManager = () => {
  const { authStatus } = useAuthenticator(context => [context.authStatus]);

  // 根据认证状态选择渲染的布局
  const isAuthenticated = authStatus === 'authenticated';

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const hasRestaurant = useSelector(selectHasRestaurant);

  useEffect(() => {
    if(!isAuthenticated) return
    const init = async () => {
      try {
        const user = await dispatch(fetchUser()).unwrap();
        // debug: print user and store state
        console.log('fetchUser result:', user);
        if (typeof window !== 'undefined' && window.__APP_STORE__) {
          console.log('store.user after fetchUser:', window.__APP_STORE__.getState().user);
        }
      } catch (e) {
        // ignore
      }
      try {
        await dispatch(fetchRestaurant()).unwrap();
        // console.log('fetchRestaurant result:', restaurant);
        // if (typeof window !== 'undefined' && window.__APP_STORE__) {
        //   console.log('store.restaurant after fetchRestaurant:', window.__APP_STORE__.getState().restaurant);
        // }
      } catch (e) {
        // ignore
      }
    };
    init();
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    // 如果没有餐厅，跳转到创建页面（注意：NoRestaurantGuard 也会控制路由）
    if (isAuthenticated && hasRestaurant === false) {
      navigate('/restaurant/create');
    }
  }, [isAuthenticated, hasRestaurant, navigate]);

  return (
    <> {/* 使用 React Fragment 包裹，因为这里是子组件的根 */}
      {isAuthenticated ? (
        // 已登录用户看到的布局
        <LayoutStandard>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dishes" element={<DishManagerPage />} />

            {/* Restaurant routes */}
            {/* Only allow create when user has NO restaurant */}
            <Route element={<NoRestaurantGuard />}> 
              <Route path="/restaurant/create" element={<CreateRestaurant />} />
            </Route>

            {/* Require existing restaurant for the following */}
            <Route element={<RestaurantGuard />}> 
              <Route path="/restaurant/info" element={<RestaurantInfo />} />
              <Route path="/restaurant/subscriptionplan" element={<SubscriptionPlan />} />
            </Route>

            {/* <Route path="/dish-types" element={<DishTypesPage />} /> */}
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