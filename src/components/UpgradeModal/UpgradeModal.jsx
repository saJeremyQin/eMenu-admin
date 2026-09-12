
import React from 'react';
import styles from './UpgradeModal.module.scss';
import { fakeCharge } from '../../lib/payments/mockPayment';

const PRICING = {
  PRO: 9.99,
};


function addMonthsISO(fromISO, months) {
  const base = fromISO ? new Date(fromISO) : new Date();
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}


const UpgradeModal = ({ open, onClose, selectedPlan, onSuccess }) => {
  const plan = selectedPlan || 'PRO';
  const [months, setMonths] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  if (!open) return null;

  const total = (PRICING[plan] * months).toFixed(2);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // 1) 假支付
      const payment = await fakeCharge({
        amount: total,
        currency: 'AUD',
        description: `${plan} x ${months} month(s)`
      });
      // 2) 计算新的过期时间（前端侧）
      const expiryISO = addMonthsISO(new Date().toISOString(), months);
      // 3) 回调让父组件尝试调用后端（若未实现则乐观更新）
      onSuccess?.({
        plan,
        months,
        expiryISO,
        paymentTransactionId: payment?.chargeId || null,
      });
    } catch (e) {
      alert('Payment failed (mock): ' + (e.message || 'Unknown'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h3>Upgrade to {plan}</h3>
        <div className={styles.row}>
          <label>Duration</label>
          <select value={months} onChange={(e) => setMonths(Number(e.target.value))}>
            <option value={1}>1 month</option>
            <option value={3}>3 months</option>
            <option value={12}>12 months</option>
          </select>
        </div>
        <div className={styles.summary}>
          <div>Plan: <strong>{plan}</strong></div>
          <div>Price: <strong>${PRICING[plan]}/month</strong></div>
          <div>Total: <strong>${total}</strong></div>
        </div>

        <div className={styles.actions}>
          <button className={styles.ghostBtn} onClick={onClose} disabled={loading}>Cancel</button>
          <button className={styles.primaryBtn} onClick={handleConfirm} disabled={loading}>
            {loading ? 'Processing...' : 'Confirm & Pay'}
          </button>
        </div>

        <p className={styles.note}>
          This is a mock payment. You can replace it with real payment later.
        </p>
      </div>
    </div>
  );
};

export default UpgradeModal;
