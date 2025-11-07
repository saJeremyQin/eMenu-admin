// src/components/Navigation/Navigation.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../lib/permissions';
import styles from './Navigation.module.scss'; // 导入模块化样式

const Navigation = () => {
  const location = useLocation();
  const userRole = useSelector((state) => state.user.role);
  
  // 判断链接是否为当前选中状态
  const isActive = (path) => location.pathname === path;
  
  return (
    <nav className={styles.nav}>
      <ul className={styles.navList}>
        <li><Link to="/" className={isActive('/') ? styles.active : ''}><span aria-hidden="true" role="img">🏠</span>Home</Link></li>
        <li className={styles.submenu}>
          <span className={styles.submenuTitle}><span aria-hidden="true" role="img">🍲</span>Dish Management</span>
          <ul>
            <li><Link to="/dishTypes" className={isActive('/dishTypes') ? styles.active : ''}><span aria-hidden="true" role="img">📝</span>DishTypes</Link></li>
            <li><Link to="/dishes" className={isActive('/dishes') ? styles.active : ''}><span aria-hidden="true" role="img">🍲</span>Dishes</Link></li>
          </ul>
        </li>
        <li><Link to="/orders" className={isActive('/orders') ? styles.active : ''}><span aria-hidden="true" role="img">🍽️</span>Orders</Link></li>
        
        {/* Waiters page - only for OWNER */}
        {hasPermission('viewWaitersPage', userRole) && (
          <li><Link to="/waiters" className={isActive('/waiters') ? styles.active : ''}><span aria-hidden="true" role="img">👥</span>Waiters</Link></li>
        )}

        <li className={styles.submenu}>
          <span className={styles.submenuTitle}><span aria-hidden="true" role="img">🏪</span>Restaurant</span>
          <ul>
            <li><Link to="/restaurant/info" className={isActive('/restaurant/info') ? styles.active : ''}><span aria-hidden="true" role="img">📝</span>Restaurant Info</Link></li>
            
            {/* Subscription Plan - only for OWNER */}
            {hasPermission('viewSubscriptionPlan', userRole) && (
              <li><Link to="/restaurant/subscriptionplan" className={isActive('/restaurant/subscriptionplan') ? styles.active : ''}><span aria-hidden="true" role="img">💎</span>Subscription Plan</Link></li>
            )}
          </ul>
        </li>
        
        {/* Settings - only for OWNER */}
        {hasPermission('viewSettings', userRole) && (
          <li><Link to="/settings" className={isActive('/settings') ? styles.active : ''}><span aria-hidden="true" role="img">⚙️</span>Setting</Link></li>
        )}
      </ul>
    </nav>
  );
};

export default Navigation;