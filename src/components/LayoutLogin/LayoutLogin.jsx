// src/components/LayoutLogin/LayoutLogin.jsx
import React from 'react';
import { Authenticator } from '@aws-amplify/ui-react'; // 导入 Authenticator
import styles from './LayoutLogin.module.scss'; // 导入模块化样式

// 导入 Emenu Logo 图片
import emenuLogo from '../../assets/eMenu-logo.png'; 

const LayoutLogin = () => {
  const formFields = {
    signUp: {
      username: { // Username is the primary identifier for the User Pool, implicitly required
        order: 1,
        placeholder: 'Enter your desired Username',
        required: true,
        label: 'Username',
        type: 'string',
      },
      email: { // Email is a required attribute by User Pool schema, also an alias for sign-in
        order: 2,
        placeholder: 'Enter your Email',
        required: true,
        label: 'Email',
        type: 'email',
      },
      password: {
        order: 3,
        placeholder: 'Enter your Password',
        required: true,
        label: 'Password',
        type: 'password',
      },
      confirm_password: {
        order: 4,
        placeholder: 'Confirm your Password',
        required: true,
        label: 'Confirm Password',
        type: 'password',
      },
    },
    signIn: {
      username: { // For sign-in, this field accepts either Username or Email (due to alias_attribuns)
        placeholder: 'Username or Email',
        label: 'Username or Email',
      }
    }
  };

  return (
    <div className={styles.loginContainer}>
      <img src={emenuLogo} alt="eMenu Logo" className={styles.logo} />
      <div className={styles.authFormWrapper}>
        <Authenticator formFields={formFields}>
          {/* Authenticator 的子内容 */}
        </Authenticator>
      </div>
    </div>
  );
};

export default LayoutLogin;
