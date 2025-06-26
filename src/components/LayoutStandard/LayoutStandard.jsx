
// src/components/Layout/Layout.jsx
import React from 'react';
import Header from '../Header/Header';       
import Navigation from '../Navigation/Navigation'; 
import styles from './LayoutStandard.module.scss';      

const LayoutStandard = ({ children }) => {
  return (
    <React.Fragment>
      <Header />
      <div className={styles.wrapper}>
        <Navigation />
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </React.Fragment>
  );
};

export default LayoutStandard;