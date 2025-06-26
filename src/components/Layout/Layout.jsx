
// src/components/Layout/Layout.jsx
import React from 'react';
import Header from '../Header/Header';       
import Navigation from '../Navigation/Navigation'; 
import styles from './Layout.module.scss';      

const Layout = ({ children }) => {
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

export default Layout;