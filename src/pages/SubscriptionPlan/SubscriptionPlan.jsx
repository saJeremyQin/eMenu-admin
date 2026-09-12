import React from 'react';
import styles from './SubscriptionPlan.module.scss';
import { generateClient } from 'aws-amplify/api';
import UpgradeModal from '../../components/UpgradeModal/UpgradeModal';

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
              waiterLimit
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

  const handleUpgradeSuccess = async ({ plan, expiryISO, paymentTransactionId }) => {
    // 优先调用真实后端；失败时做前端乐观更新
    try {
      const mutation = /* GraphQL */ `
        mutation UpdateRestaurantSubscriptionPlan($input: SubscriptionUpgradeInput!) {
          updateRestaurantSubscriptionPlan(input: $input) {
            id
            subscriptionPlan
            subscriptionExpiry
            waiterLimit
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
          waiterLimit: r.waiterLimit,
          tableLimit: r.tableLimit,
        }));
        return;
      }
      setRestaurant(prev => ({
        ...prev,
        subscriptionPlan: plan,
        subscriptionExpiry: plan === 'FREE' ? null : expiryISO,
        waiterLimit: plan === 'FREE' ? 1 : 20,
        tableLimit: plan === 'FREE' ? 20 : 100,
      }));
    } catch {
      setRestaurant(prev => ({
        ...prev,
        subscriptionPlan: plan,
        subscriptionExpiry: plan === 'FREE' ? null : expiryISO,
        waiterLimit: plan === 'FREE' ? 1 : 20,
        tableLimit: plan === 'FREE' ? 20 : 100,
      }));
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
          <div className={styles.metaRow}><span>Waiters:</span> <strong>{restaurant.waiterLimit ?? '-'}</strong></div>
          <div className={styles.metaRow}><span>Tables:</span> <strong>{restaurant.tableLimit ?? '-'}</strong></div>
        </div>
      </div>

      <div className={styles.compareSection}>
        <h2 className={styles.compareTitle}>What you get</h2>
        <div className={styles.planCardsRowCentered}>
          <div className={styles.planCardFree}>
            <div className={styles.cardHeader}>FREE</div>
            <div className={styles.price}>Free</div>
            <button className={styles.disabledBtn} disabled>{plan === 'FREE' ? 'Current Plan' : 'Included'}</button>
            <ul>
              <li>Waiters: 1</li>
              <li>Tables: up to 20</li>
              <li>Validity: perpetual</li>
              <li>Order ownership: own ongoing orders only</li>
            </ul>
          </div>
          <div className={styles.planCardPro}>
            <div className={styles.cardHeader}>PRO</div>
            <div className={styles.price}>$9.99<span className={styles.perMonth}>/month</span></div>
            <button className={styles.primaryBtn} onClick={() => { setSelectedPlan('PRO'); setShowModal(true); }}>
              {plan === 'PRO' ? 'Extend Plan' : 'Upgrade'}
            </button>
            <ul>
              <li>Waiters: up to 20</li>
              <li>Tables: up to 100</li>
              <li>Order ownership: shared ongoing orders across waiters</li>
              <li>Supports waiter pickup of pending orders</li>
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
