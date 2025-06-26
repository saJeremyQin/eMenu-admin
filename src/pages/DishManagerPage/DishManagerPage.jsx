// src/pages/DishManagerPage/DishManagerPage.jsx
import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import { useAuthenticator } from '@aws-amplify/ui-react';

import styles from './DishManagerPage.module.scss';

const client = generateClient();

// GraphQL Queries (based on the required comprehensive schema that supports User, Dishes, and DishTypes)
// Query to get the current user's restaurant ID (User model has restaurantId)
const getUserQuery = `
  query GetUser($id: ID!) {
    getUser(id: $id) {
      id
      sub
      restaurantId
      email
    }
  }
`;

// Query to list dishes (Lambda will retrieve restaurantId based on identity)
const listDishesQuery = `
  query ListDishes {
    listDishes {
      id
      name
      description
      price
      image
      dishTypeId
      restaurantId
    }
  }
`;

// Query to list dish types (Lambda will retrieve restaurantId based on identity)
const listDishTypesQuery = `
  query ListDishTypes { # No restaurantId argument, Lambda derives it
    listDishTypes {
      id
      name # Correct field name from schema
      restaurantId
    }
  }
`;

// Note: createDish, updateDish, deleteDish, and their related UI are NOT included for now
// as per user's current scope and provided schema.

function DishManagerPage() {
  const { user } = useAuthenticator((context) => [context.user]);
  const [dishes, setDishes] = useState([]);
  const [dishTypes, setDishTypes] = useState([]); // State to store dish types
  const [currentRestaurantId, setCurrentRestaurantId] = useState(null); // User's restaurant ID
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  // Initial data fetch: Get user's restaurant ID, then fetch dishes and dish types
  useEffect(() => {
    async function initPage() {
      if (!user || !user.username) {
        setError('User not logged in or user data incomplete.');
        return;
      }

      setLoading(true);
      setError(null);
      setMessage('');

      try {
        // 1. Fetch user's restaurant ID using user.username (Cognito sub)
        const userResult = await client.graphql({
          query: getUserQuery,
          variables: { id: user.username }
        });
        const fetchedUser = userResult.data.getUser;

        if (fetchedUser && fetchedUser.restaurantId) {
          setCurrentRestaurantId(fetchedUser.restaurantId);
          await fetchDishes(); // Fetch dishes only after restaurantId is known
          await fetchDishTypes(); // Fetch dish types
        } else {
          setError('Current user is not associated with a restaurant. Please ensure restaurant information is created.');
        }
      } catch (err) {
        console.error('Failed to initialize dish management page:', err);
        setError('Initialization failed: ' + (err.errors && err.errors.length > 0 ? err.errors[0].message : err.message));
      } finally {
        setLoading(false);
      }
    }

    initPage();
  }, [user]); // Re-initialize when user object changes

  // Data Fetching Function for Dishes
  async function fetchDishes() {
    setLoading(true);
    setError(null);
    try {
      const result = await client.graphql({ query: listDishesQuery });
      setDishes(result.data.listDishes || []);
      setMessage('Dish list refreshed.');
    } catch (err) {
      console.error('Failed to fetch dishes:', err);
      setError('Failed to fetch dishes: ' + (err.errors && err.errors.length > 0 ? err.errors[0].message : err.message));
    } finally {
      setLoading(false);
    }
  }

  // Data Fetching Function for Dish Types
  async function fetchDishTypes() {
    try {
      const result = await client.graphql({ query: listDishTypesQuery }); // No variables needed
      setDishTypes(result.data.listDishTypes || []);
    } catch (err) {
      console.error('Failed to fetch dish types:', err);
      // Do not set global error for dish types, as dishes might still load
    }
  }

  // Helper to get Dish Type Name from ID
  const getDishTypeName = (dishTypeId) => {
    const type = dishTypes.find(dt => dt.id === dishTypeId);
    return type ? type.name : 'Unknown Type';
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Dish Management</h2>

      {loading && <p className={styles.loading}>Loading...</p>}
      {error && <p className={styles.error}>{error}</p>}
      {message && <p className={styles.message}>{message}</p>}

      {!currentRestaurantId && !loading && !error && (
        <p className={styles.infoText}>User is not associated with a restaurant. Please ensure restaurant information is created.</p>
      )}

      {currentRestaurantId && (
        <div className={styles.tableSection}>
          <h3 className={styles.subHeading}>All Dishes</h3>
          <button onClick={fetchDishes} className={styles.refreshButton}>
            Refresh List
          </button>
          {dishes.length > 0 ? (
            <div className={styles.tableWrapper}>
              <table className={styles.dishTable}>
                <thead>
                  <tr>
                    <th>Dish Type</th>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Description</th>
                    <th>Image</th>
                    <th>Restaurant ID</th>
                  </tr>
                </thead>
                <tbody>
                  {dishes.map(dish => (
                    <tr key={dish.id}>
                      <td>{getDishTypeName(dish.dishTypeId)}</td>
                      <td>{dish.name}</td>
                      <td>${dish.price}</td>
                      <td>{dish.description || 'N/A'}</td>
                      <td>
                        {dish.image ? (
                          <img src={dish.image} alt={dish.name} className={styles.dishImage} />
                        ) : (
                          <span className={styles.noImage}>No Image</span>
                        )}
                      </td>
                      <td>{dish.restaurantId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !loading && !error && <p className={styles.infoText}>No dishes available.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default DishManagerPage;
