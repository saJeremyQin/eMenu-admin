// src/components/Header/Header.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react'; // 假设已安装

import styles from './Header.module.scss'; // 导入模块化样式
import eMenuIcon from '../../assets/eMenu-icon.svg'

const Header = () => {
  const { signOut, authStatus } = useAuthenticator(context => [context.authStatus]);
  const isLoggedIn = authStatus === 'authenticated';

  return (
    <header className={styles.headerBar}>
      <img src={ eMenuIcon } alt="eMenu Logo" height="40" />
      <h1 className={styles.logoText}>eMenu Admin</h1>
      <div className={styles.userState}>
        {isLoggedIn ? (
          <button
            onClick={() => signOut()}
            className={styles.buttonAsLink} // 使用模块化类名
          >
            Logout
          </button>
        ) : (
          <p>
            <Link to={'/auth'}>Sign In/Up</Link>
          </p>
        )}
      </div>
    </header>
  );
};

export default Header;