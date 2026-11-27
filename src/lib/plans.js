// Plan display info for the admin. The limits themselves come from the backend
// (Restaurant.tableLimit, derived from the plan there); this file is display copy only.

export const PRO_PRICE_AUD = 19.99; // per month

// The backend caps PRO at 999 tables only to catch typos; to users it is unlimited.
export function formatTableLimit(restaurant) {
  if (!restaurant?.tableLimit) return '-';
  return restaurant.subscriptionPlan === 'PRO' ? 'Unlimited' : String(restaurant.tableLimit);
}
