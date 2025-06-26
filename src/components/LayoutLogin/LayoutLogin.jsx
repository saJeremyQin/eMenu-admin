// src/components/LayoutLogin/LayoutLogin.jsx
import React from 'react';
import { Authenticator } from '@aws-amplify/ui-react'; // 导入 Authenticator
import styles from './LayoutLogin.module.scss'; // 导入模块化样式

// 导入 Emenu Logo 图片
import emenuLogo from '../../assets/eMenu-logo.png'; 

const LayoutLogin = () => {
  return (
    <div className={styles.loginContainer}>
      <img src={emenuLogo} alt="eMenu Logo" className={styles.logo} />
      <div className={styles.authFormWrapper}>
        {/* Authenticator 组件将在这里渲染登录/注册表单 */}
        <Authenticator />
      </div>
    </div>
  );
};

export default LayoutLogin;
