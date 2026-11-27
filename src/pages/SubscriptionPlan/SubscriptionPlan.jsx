import React from 'react';
import styles from './SubscriptionPlan.module.scss';
import { generateClient } from 'aws-amplify/api';
import UpgradeModal from '../../components/UpgradeModal/UpgradeModal';
import { PRO_PRICE_AUD, formatTableLimit } from '../../lib/plans';

const client = generateClient();

function daysLeft(expiryISO) {
  if (!expiryISO) return null;
  const end = new Date(expiryISO);
  const now = new Date();
  return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
}

function formatDate(expiryISO) {
  if (!expiryISO) return 'Never expires';
  try {
    return new Date(expiryISO).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return expiryISO;
  }
}

const SubscriptionPlan = () => {
  const [loading, setLoading] = React.useState(true);
  const [restaurant, setRestaurant] = React.useState(null);
  const [showModal, setShowModal] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState(null);
  const [error, setError] = React.useState(null);


  React.useEffect(() => {
    const run = async () => {
      try {
        const restaurantQuery = /* GraphQL */ `
          query GetRestaurant {
            getRestaurant {
              id 
              name 
              address 
              phone 
              logoUrl
              subscriptionPlan 
              subscriptionExpiry
              tableLimit
            }
          }
        `;
        const res = await client.graphql({ 
          query: restaurantQuery
        });
        setRestaurant(res?.data?.getRestaurant || null);        
      } catch (e) {
        console.error('Load subscription failed', e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  // Show only what the server returns: no optimistic update. (PRO is granted by the
  // backend after a verified payment; a failed call must not show PRO.)
  const handleUpgradeSuccess = async ({ plan, expiryISO, paymentTransactionId }) => {
    setError(null);
    try {
      const mutation = /* GraphQL */ `
        mutation UpdateRestaurantSubscriptionPlan($input: SubscriptionUpgradeInput!) {
          updateRestaurantSubscriptionPlan(input: $input) {
            id
            subscriptionPlan
            subscriptionExpiry
            tableLimit
          }
        }
      `;
      const resp = await client.graphql({
        query: mutation,
        variables: {
          input: {
            subscriptionPlan: plan,
            subscriptionExpiry: plan === 'FREE' ? null : expiryISO,
            paymentTransactionId,
          },
        },
      });
      const r = resp?.data?.updateRestaurantSubscriptionPlan;
      if (r) {
        setRestaurant(prev => ({
          ...prev,
          subscriptionPlan: r.subscriptionPlan,
          subscriptionExpiry: r.subscriptionExpiry,
          tableLimit: r.tableLimit,
        }));
        return;
      }
      setError('The subscription could not be updated. Please try again.');
    } catch (e) {
      console.error('Update subscription failed', e);
      const message = e?.errors?.[0]?.message || '';
      setError(message.includes('PERMISSION_DENIED')
        ? 'Online payment for PRO is coming soon. Your plan has not been changed.'
        : 'The subscription could not be updated. Please try again.');
    }
  };

  if (loading) return <div className={styles.container}><p>Loading...</p></div>;
  if (!restaurant) return <div className={styles.container}><p>No restaurant found.</p></div>;

  const plan = restaurant.subscriptionPlan || 'FREE';
  const expiryText = formatDate(restaurant.subscriptionExpiry);
  const left = daysLeft(restaurant.subscriptionExpiry);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Subscription Plan</h1>

      <div className={styles.section}>
        <div className={styles.infoCardCentered}>
          <div className={styles.planType}>{plan}</div>
          <div className={styles.metaRow}><span>Expire date:</span> <strong>{expiryText}</strong></div>
          {restaurant.subscriptionExpiry && (
            <div className={styles.metaRow}><span>Days left:</span> <strong>{left} day{left === 1 ? '' : 's'}</strong></div>
          )}
          <div className={styles.metaRow}><span>Tables:</span> <strong>{formatTableLimit(restaurant)}</strong></div>
          <div className={styles.metaRow}><span>Dishes, categories, waiters:</span> <strong>Unlimited</strong></div>
        </div>
        {error && <p role="alert" className={styles.error}>{error}</p>}
      </div>

      <div className={styles.compareSection}>
        <h2 className={styles.compareTitle}>What you get</h2>
        <div className={styles.planCardsRowCentered}>
          <div className={styles.planCardFree}>
            <div className={styles.cardHeader}>FREE</div>
            <div className={styles.price}>Free</div>
            <button className={styles.disabledBtn} disabled>{plan === 'FREE' ? 'Current Plan' : 'Included'}</button>
            <ul>
              <li>Tables: 1-8</li>
              <li>Unlimited dishes, categories and waiters</li>
              <li>All waiters share tables</li>
              <li>Free forever</li>
            </ul>
          </div>
          <div className={styles.planCardPro}>
            <div className={styles.cardHeader}>PRO</div>
            <div className={styles.price}>${PRO_PRICE_AUD}<span className={styles.perMonth}>/month</span></div>
            <button className={styles.primaryBtn} onClick={() => { setSelectedPlan('PRO'); setShowModal(true); }}>
              {plan === 'PRO' ? 'Extend Plan' : 'Upgrade'}
            </button>
            <ul>
              <li>Unlimited tables</li>
              <li>Unlimited dishes, categories and waiters</li>
              <li>All waiters share tables</li>
              <li>Customer QR ordering (coming soon)</li>
            </ul>
          </div>
        </div>
      </div>

      <UpgradeModal
        open={showModal}
        onClose={() => setShowModal(false)}
        currentPlan={plan}
        selectedPlan={selectedPlan}
        onSuccess={(payload) => {
          handleUpgradeSuccess(payload);
          setShowModal(false);
        }}
      />
    </div>
  );
};

export default SubscriptionPlan;
