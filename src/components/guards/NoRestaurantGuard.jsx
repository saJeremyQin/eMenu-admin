import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';

const client = generateClient();

// Only allow access to children if user has NO restaurant yet.
const NoRestaurantGuard = () => {
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
        console.log('NoRestaurantGuard - User data:', userData);
        
        // 检查是否有 restaurantId 且不为空
        const hasValidRestaurant = userData?.restaurantId && userData.restaurantId.trim() !== '';
        setHasRestaurant(hasValidRestaurant);
        console.log('NoRestaurantGuard - Has restaurant:', hasValidRestaurant);
      } catch (e) {
        console.error('NoRestaurantGuard error:', e);
        setHasRestaurant(false);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  if (loading) return <div>Loading NoRestaurantGuard...</div>;
  
  console.log('NoRestaurantGuard rendering - hasRestaurant:', hasRestaurant);
  return hasRestaurant ? <Navigate to="/restaurant/info" replace /> : <Outlet />;
};

export default NoRestaurantGuard;
