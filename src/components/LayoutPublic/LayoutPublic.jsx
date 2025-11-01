// src/components/LayoutPublic/LayoutPublic.jsx
import React from 'react';
import emenuLogo from '../../assets/eMenu-logo.png';
import styles from './LayoutPublic.module.scss';

const LayoutPublic = (props) => (
  <div className={styles.publicContainer}>
    <img src={emenuLogo} alt="eMenu Logo" className={styles.logo} />
    <div className={styles.contentWrapper}>
      {props.children}
    </div>
  </div>
);

export default LayoutPublic;
