import React from 'react';
import styles from './SubscriptionPlan.module.scss';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';

const client = generateClient();

const SubscriptionPlan = () => {
  const [loading, setLoading] = React.useState(true);
  const [plan, setPlan] = React.useState(null);

  React.useEffect(() => {
    const run = async () => {
      try {
        const user = await getCurrentUser();
        const query = /* GraphQL */ `
          query GetMySubscription($ownerId: ID!) {
            getRestaurantByOwner(ownerId: $ownerId) {
              id subscriptionPlan subscriptionExpiry
            }
          }
        `;
        const res = await client.graphql({ query, variables: { ownerId: user.userId } });
        setPlan(res?.data?.getRestaurantByOwner || null);
      } catch (e) {
        console.error('Load subscription failed', e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  if (loading) return <div className={styles.page}><p>Loading...</p></div>;
  if (!plan) return <div className={styles.page}><p>No subscription info.</p></div>;

  const isPremium = plan.subscriptionPlan === 'PREMIUM';

  return (
    <div className={styles.page}>
      <h1>Subscription Plan</h1>
      <div className={styles.card}>
        <p>Current Plan: <strong>{plan.subscriptionPlan || 'FREE'}</strong></p>
        <p>Expires: <strong>{plan.subscriptionExpiry || 'N/A'}</strong></p>
        <div className={styles.actions}>
          {!isPremium ? (
            <button type="button" onClick={() => alert('Upgrade flow TBD')}>Upgrade to Premium</button>
          ) : (
            <button type="button" onClick={() => alert('Renew flow TBD')}>Renew</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlan;
