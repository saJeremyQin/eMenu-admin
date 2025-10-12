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
          query GetMyRestaurantMeta($ownerId: ID!) {
            getUser(ownerId: $ownerId) { id restaurantId }
          }
        `;
        const res = await client.graphql({ query, variables: { ownerId: user.userId } });
        const userData = res?.data?.getUser;
        setHasRestaurant(!!userData?.restaurantId);
      } catch (e) {
        console.error('NoRestaurantGuard error:', e);
        setHasRestaurant(false);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  if (loading) return null; // optionally a spinner
  return hasRestaurant ? <Navigate to="/restaurant/info" replace /> : <Outlet />;
};

export default NoRestaurantGuard;
