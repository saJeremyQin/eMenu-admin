// src/pages/DishManagerPage/DishManagerPage.jsx
import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import { useAuthenticator } from '@aws-amplify/ui-react';

import styles from './DishManagerPage.module.scss';

const client = generateClient();

// GraphQL Queries
const getUserQuery = `
  query GetUser($id: ID!) {
    getUser(id: $id) {
      id
      restaurantId
      email
    }
  }
`;

// Key change: listDishesQuery now requests nested dishType fields
const listDishesQuery = `
  query ListDishes {
    listDishes {
      id
      name
      description
      price
      image
      restaurantId
      dishType { # <-- Request the nested DishType object
        id
        title
        alias
        # restaurantId # Optional: Can include if needed for debugging or display
      }
    }
  }
`;

function DishManagerPage() {
  // Extract user and authStatus from useAuthenticator
  const { user, authStatus } = useAuthenticator((context) => [context.user, context.authStatus]);

  const [dishes, setDishes] = useState([]);
  const [currentRestaurantId, setCurrentRestaurantId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  // Initial data fetch: Get user's restaurant ID, then fetch dishes (with nested dishType)
  useEffect(() => {
    async function initPage() {
      console.log("useEffect triggered. Current authStatus:", authStatus);
      console.log("Current user object:", JSON.stringify(user, null, 2));

      // Condition to proceed with data fetching:
      // 1. User must be authenticated
      // 2. User object and its userId (which contains the SUB ID) must be present
      if (authStatus !== 'authenticated' || !user || !user.userId) { // <-- Key change: checking user.userId instead of user.attributes.sub
        console.log("Skipping initPage: Auth status not authenticated or user SUB ID missing from user.userId.");
        setLoading(false); // Ensure loading is off if we don't proceed
        // Set a more specific error based on authStatus
        if (authStatus === 'unauthenticated') {
            setError('You are not logged in. Please log in first.');
        } else if (authStatus === 'configuring') {
            setError('Configuring authentication information, please wait...');
        } else {
            setError('Incomplete user identity information. Could not retrieve SUB ID. Please try refreshing the page or logging in again.');
            console.error("Incomplete user object:", user);
        }
        return;
      }

      setLoading(true);
      setError(null);
      setMessage('');

      try {
        const userSubToQuery = user.userId; // <-- Key change: using user.userId
        console.log("Attempting to fetch user data from backend for SUB:", userSubToQuery);

        const userResult = await client.graphql({
          query: getUserQuery,
          variables: { id: userSubToQuery }
        });
        const fetchedUser = userResult.data.getUser;

        if (fetchedUser && fetchedUser.restaurantId) {
          setCurrentRestaurantId(fetchedUser.restaurantId);
          await fetchDishes(); // Fetch dishes, which now includes dishType info
        } else {
          setError('The current user is not associated with any restaurant. Please ensure restaurant information is created.');
          console.log("Fetched user:", fetchedUser, "has no restaurantId.");
        }
      } catch (err) {
        console.error('Failed to initialize dish management page:', err);
        setError('Initialization failed: ' + (err.errors && err.errors.length > 0 ? err.errors[0].message : err.message));
      } finally {
        setLoading(false);
      }
    }

    initPage();
  }, [user, authStatus]); // Dependency array: Re-run when user object or authStatus changes.

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

  // Helper to get Dish Type Name from the nested object
  const getDishTypeName = (dish) => {
    // Check if dish.dishType exists and has a title
    return dish.dishType ? dish.dishType.title : 'Unknown Type (Error)';
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Dish Management</h2>

      {loading && <p className={styles.loading}>Loading...</p>}
      {error && <p className={styles.error}>{error}</p>}
      {message && <p className={styles.message}>{message}</p>}

      {/* Conditionally render based on currentRestaurantId after loading */}
      {!loading && !currentRestaurantId && !error && (
        <p className={styles.infoText}>User is not associated with a restaurant. Please ensure restaurant information is created.</p>
      )}

      {currentRestaurantId && (
        <div className={styles.tableSection}>
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
                      <td>{getDishTypeName(dish)}</td>
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
