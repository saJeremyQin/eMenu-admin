import React from 'react';
import styles from './SubscriptionPlan.module.scss';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import UpgradeModal from '../../components/UpgradeModal/UpgradeModal';

const client = generateClient();

function daysLeft(expiryISO) {
  if (!expiryISO) return null;
  const end = new Date(expiryISO);
  const now = new Date();
  return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
}

function formatDate(expiryISO) {
  if (!expiryISO) return 'N/A';
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
              image 
              subscriptionPlan 
              subscriptionExpiry
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

  const handleUpgradeSuccess = async ({ plan, months, expiryISO }) => {
    // 尝试调用真实后端（若未实现则前端乐观更新）
    try {
      const mutation = /* GraphQL */ `
        mutation UpdateSubscription($plan: SubscriptionPlan!, $months: Int!) {
          updateSubscription(plan: $plan, months: $months) {
            id
            subscriptionPlan
            subscriptionExpiry
          }
        }
      `;
      const resp = await client.graphql({
        query: mutation,
        variables: { plan, months }
      });
      const r = resp?.data?.updateSubscription;
      if (r) {
        setRestaurant(prev => ({
          ...prev,
          subscriptionPlan: r.subscriptionPlan,
          subscriptionExpiry: r.subscriptionExpiry
        }));
        return;
      }
      setRestaurant(prev => ({
        ...prev,
        subscriptionPlan: plan,
        subscriptionExpiry: expiryISO
      }));
    } catch {
      setRestaurant(prev => ({
        ...prev,
        subscriptionPlan: plan,
        subscriptionExpiry: expiryISO
      }));
    }
  };

  if (loading) return <div className={styles.container}><p>Loading...</p></div>;
  if (!restaurant) return <div className={styles.container}><p>No restaurant found.</p></div>;

  const plan = restaurant.subscriptionPlan || 'BASIC'; // 原样展示
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
        </div>
      </div>

      <div className={styles.compareSection}>
        <h2 className={styles.compareTitle}>What you get</h2>
        <div className={styles.planCardsRowCentered}>
          <div className={styles.planCardBasic}>
            <div className={styles.cardHeader}>BASIC</div>
            <div className={styles.price}>Free</div>
            <button className={styles.disabledBtn} disabled>Get Started</button>
            <ul>
              <li>Menu items limit: 10</li>
              <li>Images: limited</li>
              <li>Analytics: Not included</li>
              <li>Theme: Default only</li>
            </ul>
          </div>
          <div className={styles.planCardPremium}>
            <div className={styles.cardHeader}>PREMIUM</div>
            <div className={styles.price}>$9.99<span className={styles.perMonth}>/month</span></div>
            <button className={styles.primaryBtn}>Get Started</button>
            <ul>
              <li>Menu items: Unlimited</li>
              <li>Images: Unlimited</li>
              <li>Analytics: Included</li>
              <li>Themes: Customizable</li>
            </ul>
          </div>
          <div className={styles.planCardUltimate}>
            <div className={styles.cardHeader}>ULTIMATE</div>
            <div className={styles.price}>$29.99<span className={styles.perMonth}>/month</span></div>
            <button className={styles.primaryBtn}>Get Started</button>
            <ul>
              <li>Menu items: 1000</li>
              <li>Images: Unlimited</li>
              <li>Analytics: Advanced</li>
              <li>Themes: All features</li>
            </ul>
          </div>
        </div>
      </div>

      <UpgradeModal
        open={showModal}
        onClose={() => setShowModal(false)}
        currentPlan={plan}
        onSuccess={(payload) => {
          handleUpgradeSuccess(payload);
          setShowModal(false);
        }}
      />
    </div>
  );
};

export default SubscriptionPlan;
