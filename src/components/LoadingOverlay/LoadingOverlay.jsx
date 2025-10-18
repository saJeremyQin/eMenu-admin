import React from 'react';
import styles from './LoadingOverlay.module.scss';

const LoadingOverlay = ({ label = 'Loading...' }) => {
  return (
    <div className={styles.loadingOverlay}>
      <div className={styles.loadingBox}>
        <div className={styles.spinner} />
        <div className={styles.label}>{label}</div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
