// src/pages/HomePage/HomePage.jsx
import React from 'react';
import { useSelector } from 'react-redux';
import { ROLES, getRoleName } from '../../lib/permissions';
import styles from './HomePage.module.scss'; 

function HomePage() {
  const user = useSelector((state) => state.user);
  const isWaiter = user.role === ROLES.WAITER;
  
  return (
    <div className={styles.homeContainer}>
      <h2 className={styles.heading}>
        Welcome to eMenu Admin{user.email ? `, ${user.email}` : ''}!
      </h2>
      
      {user.role && (
        <p className={styles.roleText}>
          Role: <strong>{getRoleName(user.role)}</strong>
        </p>
      )}
      
      <hr className={styles.separator} />
      
      {isWaiter ? (
        <>
          <div className={styles.waiterWelcome}>
            <h3>📱 Tablet App Instructions</h3>
            <p className={styles.infoText}>
              As a waiter, you can use the <strong>eMenu Tablet App</strong> to take orders for customers.
            </p>
            <ol className={styles.instructionList}>
              <li>Open the eMenu Tablet App on your tablet device</li>
              <li>Sign in with your email and password</li>
              <li>Browse the menu and take customer orders</li>
              <li>View your order history in the Orders section</li>
            </ol>
            
            <h3>🍽️ What You Can Do Here</h3>
            <ul className={styles.featureList}>
              <li><strong>Dishes:</strong> View all available dishes and their details (read-only)</li>
              <li><strong>Orders:</strong> View orders you've created</li>
              <li><strong>Restaurant Info:</strong> View restaurant information (read-only)</li>
            </ul>
            
            <p className={styles.helpText}>
              If you need any assistance, please contact your restaurant manager.
            </p>
          </div>
        </>
      ) : (
        <>
          <p className={styles.subText}>
            This is your restaurant management dashboard.
          </p>
          <p className={styles.infoText}>
            Congratulations! You have logged in successfully.
            Use the navigation menu to manage dishes, orders, waiters, and restaurant information.
          </p>
        </>
      )}
    </div>
  );
}

export default HomePage;