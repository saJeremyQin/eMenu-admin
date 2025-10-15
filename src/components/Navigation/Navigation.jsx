// src/components/Navigation/Navigation.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Navigation.module.scss'; // 导入模块化样式

const Navigation = () => {
  const location = useLocation();
  
  // 判断链接是否为当前选中状态
  const isActive = (path) => location.pathname === path;
  
  return (
    <nav className={styles.nav}>
      <ul className={styles.navList}>
        <li><Link to="/" className={isActive('/') ? styles.active : ''}><span aria-hidden="true" role="img">🏠</span>Home</Link></li>
        <li><Link to="/dishes" className={isActive('/dishes') ? styles.active : ''}><span aria-hidden="true" role="img">🍲</span>Dishes</Link></li>
        <li><Link to="/menu-items" className={isActive('/menu-items') ? styles.active : ''}><span aria-hidden="true" role="img">🍽️</span>Orders</Link></li>
        <li className={styles.submenu}>
          <span className={styles.submenuTitle}><span aria-hidden="true" role="img">🏪</span>Restaurant</span>
          <ul>
            <li><Link to="/restaurant/info" className={isActive('/restaurant/info') ? styles.active : ''}><span aria-hidden="true" role="img">📝</span>Restaurant Info</Link></li>
            <li><Link to="/restaurant/subscriptionplan" className={isActive('/restaurant/subscriptionplan') ? styles.active : ''}><span aria-hidden="true" role="img">💎</span>Subscription Plan</Link></li>
          </ul>
        </li>
        <li><Link to="/settings" className={isActive('/settings') ? styles.active : ''}><span aria-hidden="true" role="img">⚙️</span>Setting</Link></li>
      </ul>
    </nav>
  );
};

export default Navigation;