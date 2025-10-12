import React from 'react';
import styles from './RestaurantInfo.module.scss';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';

const client = generateClient();

const RestaurantInfo = () => {
  const [loading, setLoading] = React.useState(true);
  const [restaurant, setRestaurant] = React.useState(null);

  React.useEffect(() => {
    const run = async () => {
      try {
        const user = await getCurrentUser();
        const query = /* GraphQL */ `
          query GetMyRestaurant($ownerId: ID!) {
            getRestaurantByOwner(ownerId: $ownerId) {
              id name address phone logoUrl images subscriptionPlan subscriptionExpiry
            }
          }
        `;
        const res = await client.graphql({ query, variables: { ownerId: user.userId } });
        setRestaurant(res?.data?.getRestaurantByOwner || null);
      } catch (e) {
        console.error('Load restaurant failed', e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get('name'),
      address: form.get('address'),
      phone: form.get('phone'),
      // logo/images update can be wired to your existing upload flow
    };

    try {
      const mutation = /* GraphQL */ `
        mutation UpdateRestaurant($input: UpdateRestaurantInput!) {
          updateRestaurant(input: $input) { id name address phone logoUrl }
        }
      `;
      await client.graphql({ query: mutation, variables: { input: { id: restaurant.id, ...payload } } });
      alert('Restaurant updated');
    } catch (e) {
      console.error('Update failed', e);
      alert('Update failed');
    }
  };

  if (loading) return <div className={styles.page}><p>Loading...</p></div>;
  if (!restaurant) return <div className={styles.page}><p>No restaurant found.</p></div>;

  return (
    <div className={styles.page}>
      <h1>Restaurant Info</h1>
      <form onSubmit={onSubmit} className={styles.form}>
        <label>
          Name
          <input name="name" defaultValue={restaurant.name || ''} />
        </label>
        <label>
          Address
          <input name="address" defaultValue={restaurant.address || ''} />
        </label>
        <label>
          Phone
          <input name="phone" defaultValue={restaurant.phone || ''} />
        </label>

        {/* Minimal logo/images placeholders; can be integrated with existing upload component */}
        <div className={styles.imagesSection}>
          <p>Logo</p>
          {restaurant.logoUrl ? <img src={restaurant.logoUrl} alt="logo" className={styles.logo} /> : <span>No logo</span>}
        </div>

        <button type="submit">Save</button>
      </form>
    </div>
  );
};

export default RestaurantInfo;
