import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';

const client = generateClient();

// Very light guard: if user has a restaurantId, allow; otherwise redirect to create
const RestaurantGuard = () => {
  const [loading, setLoading] = React.useState(true);
  const [hasRestaurant, setHasRestaurant] = React.useState(false);

  React.useEffect(() => {
    const run = async () => {
      try {
        const user = await getCurrentUser();
        const query = /* GraphQL */ `
          query GetMyRestaurantMeta($id: ID!) {
            getUser(id: $id) { id restaurantId }
          }
        `;
        const res = await client.graphql({ query, variables: { id: user.userId } });
        const userData = res?.data?.getUser;
        console.log('RestaurantGuard - User data:', userData);
        
        // 检查是否有 restaurantId 且不为空
        const hasValidRestaurant = userData?.restaurantId && userData.restaurantId.trim() !== '';
        setHasRestaurant(hasValidRestaurant);
        console.log('RestaurantGuard - Has restaurant:', hasValidRestaurant);
      } catch (e) {
        console.error('RestaurantGuard error:', e);
        setHasRestaurant(false);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  if (loading) return <div>Loading RestaurantGuard...</div>;
  
  console.log('RestaurantGuard rendering - hasRestaurant:', hasRestaurant);
  return hasRestaurant ? <Outlet /> : <Navigate to="/restaurant/create" replace />;
};

export default RestaurantGuard;
