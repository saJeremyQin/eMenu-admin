// src/components/Navigation/Navigation.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Navigation.module.scss'; // 导入模块化样式

const Navigation = () => {
  return (
    <nav className={styles.nav}>
      <ul className={styles.navList}>
        <li><Link to="/"><span aria-hidden="true" role="img">🏠</span>Home</Link></li>
        <li><Link to="/menu-items"><span aria-hidden="true" role="img">🍽️</span>Menu</Link></li>
        <li><Link to="/dish-types"><span aria-hidden="true" role="img">🏢</span>Dishes</Link></li>
        <li><Link to="/restaurants"><span aria-hidden="true" role="img">🏢</span>Restaurant</Link></li>
        <li><Link to="/settings"><span aria-hidden="true" role="img">⚙️</span>Setting</Link></li>
      </ul>
    </nav>
  );
};

export default Navigation;