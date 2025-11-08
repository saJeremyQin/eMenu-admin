/**
 * Role-based permissions configuration for eMenu Admin
 * 
 * Roles:
 * - BOSS: Restaurant owner with full access
 * - WAITER: Staff with limited read-only access
 */

export const ROLES = {
  BOSS: 'boss',
  WAITER: 'waiter',
};

// Normalize input role to our canonical lowercase values to be resilient to legacy/uppercase data
const normalizeRole = (role) => (typeof role === 'string' ? role.toLowerCase() : role);

/**
 * Permission checks for different features
 */
export const PERMISSIONS = {
  // Navigation visibility
  viewWaitersPage: (role) => normalizeRole(role) === ROLES.BOSS,
  viewSubscriptionPlan: (role) => normalizeRole(role) === ROLES.BOSS,
  viewSettings: (role) => normalizeRole(role) === ROLES.BOSS,
  
  // Dishes permissions
  viewDishes: () => true, // Both can view
  createDish: (role) => normalizeRole(role) === ROLES.BOSS,
  editDish: (role) => normalizeRole(role) === ROLES.BOSS,
  deleteDish: (role) => normalizeRole(role) === ROLES.BOSS,
  updateDishAvailability: (role) => normalizeRole(role) === ROLES.BOSS,
  
  // Dish types (分类) permissions
  viewDishTypes: () => true, // Both can view dish types
  createDishType: (role) => normalizeRole(role) === ROLES.BOSS,
  editDishType: (role) => normalizeRole(role) === ROLES.BOSS,
  deleteDishType: (role) => normalizeRole(role) === ROLES.BOSS,
  toggleDishTypeStatus: (role) => normalizeRole(role) === ROLES.BOSS,
  
  // Orders permissions
  viewOrders: () => true, // Both can view
  viewOwnOrders: (role) => normalizeRole(role) === ROLES.WAITER, // Waiters can only see their own orders
  viewAllOrders: (role) => normalizeRole(role) === ROLES.BOSS, // Boss can see all
  updateOrderStatus: (role) => normalizeRole(role) === ROLES.BOSS, // Only boss can update
  
  // Restaurant info permissions
  viewRestaurantInfo: () => true, // Both can view
  editRestaurantInfo: (role) => normalizeRole(role) === ROLES.BOSS,
  editSubscriptionPlan: (role) => normalizeRole(role) === ROLES.BOSS,
};

/**
 * Helper to check if user has permission
 * @param {string} permission - Permission key from PERMISSIONS
 * @param {string} role - User's role
 * @returns {boolean}
 */
export const hasPermission = (permission, role) => {
  const permissionFn = PERMISSIONS[permission];
  if (!permissionFn) {
    console.warn(`Permission "${permission}" not found`);
    return false;
  }
  return permissionFn(role);
};

/**
 * Get user-friendly role name
 */
export const getRoleName = (role) => {
  switch (normalizeRole(role)) {
    case ROLES.BOSS:
      return 'Restaurant Owner';
    case ROLES.WAITER:
      return 'Waiter';
    default:
      return 'Unknown';
  }
};
