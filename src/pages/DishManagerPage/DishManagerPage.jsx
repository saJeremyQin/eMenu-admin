
import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectRestaurant, selectRestaurantLoaded } from '../../store/restaurantSlice';
import { hasPermission, ROLES } from '../../lib/permissions';

import styles from './DishManagerPage.module.scss';

const client = generateClient();

// GraphQL Queries

// Key change: listDishesQuery now requests nested dishType fields, using name not title
const listDishesQuery = `
  query ListDishes {
    listDishes {
      id
      name
      description
      price
      imageUrl
      restaurantId
      dishType { # <-- Request the nested DishType object
        id
        name    # was title, now name
        alias
        # restaurantId # Optional: Can include if needed for debugging or display
      }
    }
  }
`;

function DishManagerPage() {
  // Extract user and authStatus from useAuthenticator
  const [dishes, setDishes] = useState([]);
  const [currentRestaurantId, setCurrentRestaurantId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // Use Redux store to get the current restaurant (loaded via app init)
  const restaurant = useSelector(selectRestaurant);
  const restaurantLoaded = useSelector(selectRestaurantLoaded);
  
  // Get user role for permission checks
  const userRole = useSelector((state) => state.user.role);
  const canEdit = hasPermission('editDish', userRole);
  const isWaiter = userRole === ROLES.WAITER;

  // When restaurant data becomes available, set restaurantId and fetch dishes
  useEffect(() => {
    const initFromStore = async () => {
      setLoading(true);
      setError(null);
      setMessage('');

      try {
        if (!restaurantLoaded) {
          // still loading; do nothing and wait for next effect
          return;
        }

        if (restaurant && restaurant.id) {
          setCurrentRestaurantId(restaurant.id);
          await fetchDishes();
        } else {
          setCurrentRestaurantId(null);
          setError('The current user is not associated with any restaurant. Please ensure restaurant information is created.');
        }
      } catch (err) {
        console.error('Failed to initialize dish management page from store:', err);
        setError('Initialization failed: ' + (err.errors && err.errors.length > 0 ? err.errors[0].message : err.message));
      } finally {
        setLoading(false);
      }
    };

    initFromStore();
  }, [restaurantLoaded, restaurant]);

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
    return dish.dishType ? dish.dishType.name : 'Unknown Type (Error)';
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>
        {isWaiter ? 'Dishes (Read-Only)' : 'Dish Management'}
      </h2>
      
      {isWaiter && (
        <div className={styles.infoAlert}>
          <p>ℹ️ You are viewing dishes in read-only mode. Contact your manager to make changes.</p>
        </div>
      )}

      {loading && <p className={styles.loading}>Loading...</p>}
      {error && <p className={styles.error}>{error}</p>}
      {message && <p className={styles.message}>{message}</p>}

      {/* Conditionally render based on currentRestaurantId after loading */}
      {!loading && !currentRestaurantId && !error && (
        <div className={styles.infoBlock}>
          <p className={styles.infoText}>User is not associated with a restaurant. Please create one to manage dishes.</p>
          {canEdit && (
            <button
              className={styles.createRestaurantButton}
              onClick={() => navigate('/restaurant/create')}
            >
              Create Restaurant
            </button>
          )}
        </div>
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
                        {(dish.imageUrl || dish.image) ? (
                          <img src={dish.imageUrl || dish.image} alt={dish.name} className={styles.dishImage} />
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