// src/pages/HomePage/HomePage.jsx
import React from 'react';
import { Authenticator } from '@aws-amplify/ui-react'; // 假设已安装
import styles from './HomePage.module.scss'; // 导入模块化样式

function HomePage() {
  return (
    <div className={styles.homeContainer}> {/* 使用模块化类名 */}
      <h2 className={styles.heading}>Welcome to eMenu Admin!</h2>
      <p className={styles.subText}>This is your homepage content</p>
      <div className={styles.authenticatorWrapper}> {/* Authenticator 的容器 */}
        <Authenticator />
      </div>
    </div>
  );
}

export default HomePage;