// src/pages/HomePage/HomePage.jsx
import React from 'react';
import styles from './HomePage.module.scss'; 

function HomePage() {
  return (
    <div className={styles.homeContainer}> {/* 使用模块化类名 */}
      <h2 className={styles.heading}>Welcome to eMenu Admin!</h2>
      <p className={styles.subText}>This is dev/prod Homepage content。</p>
      <hr className={styles.separator} /> {/* divide line */}
      <p className={styles.infoText}>
        Congratulations! You have login successfully!
        This is where you put components, to interact with the AppSync.
      </p>
    </div>
  );
}

export default HomePage;