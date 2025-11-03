# Waiter Role-Based Access Control (RBAC) Implementation

## Overview

This document describes the role-based permission system implemented for the eMenu Admin application, specifically focusing on the WAITER role with limited read-only access compared to the OWNER role.

## Roles

### BOSS (Restaurant Owner)
- Full access to all features
- Can create, edit, and delete dishes and dish types
- Can invite and manage waiters
- Can modify restaurant information
- Can manage subscription plans
- Can view all orders and update order status
- Can checkout orders

### WAITER (Restaurant Staff)
- Limited read-only and operational access
- Can view dishes and dish types (read-only)
- Can place orders (placeOrder mutation)
- Can view orders (only their own orders)
- Can view restaurant information (read-only)
- Cannot create/edit/delete dishes or dish types
- Cannot update order status or checkout orders
- Cannot access waiters management
- Cannot access subscription plans
- Cannot access settings

## Implementation Components

### 1. Permission Configuration (`src/lib/permissions.js`)

Central permissions file defining:
- Role constants: `ROLES.BOSS`, `ROLES.WAITER` (lowercase values: 'boss', 'waiter')
- Permission functions for each feature
- Helper function `hasPermission(permission, role)`
- Role name formatter `getRoleName(role)`
- Case normalization to handle legacy uppercase role values

```javascript
// Example usage
import { hasPermission, ROLES } from '../../lib/permissions';

const canEdit = hasPermission('editDish', userRole);
const isWaiter = userRole === ROLES.WAITER;
```

**Key Implementation Details:**
- Role values are lowercase ('boss', 'waiter') to match backend storage
- `normalizeRole()` helper ensures case-insensitive comparisons
- Permission checks use normalized role values for consistency

### 2. Permission Guard Component (`src/components/guards/PermissionGuard.jsx`)

React component for route-level protection:
- Redirects unauthorized users to home page
- Used in App.jsx to protect owner-only routes

```javascript
// Example usage in routes
<Route path="/waiters" element={
  <PermissionGuard permission="viewWaitersPage">
    <WaitersPage />
  </PermissionGuard>
} />
```

### 3. UI Components with Permission Checks

#### Navigation (`src/components/Navigation/Navigation.jsx`)
- Conditionally renders menu items based on role
- BOSS sees all menu items
- WAITER navigation shows only: Home, Dishes, Orders, Restaurant Info
- Hidden items for WAITER:
  - Waiters page
  - Subscription Plan
  - Settings

#### HomePage (`src/pages/HomePage/HomePage.jsx`)
- Different welcome messages for BOSS vs WAITER
- WAITER sees specific instructions for using tablet app
- Lists accessible features based on role
- Displays user role name using `getRoleName()`

#### DishManagerPage (`src/pages/DishManagerPage/DishManagerPage.jsx`)
- Shows "Dishes (Read-Only)" title for waiters
- Displays info alert for waiters
- Hides "Create Restaurant" button for waiters
- Future: Can hide edit/delete buttons in dish list

#### RestaurantInfo (`src/pages/RestaurantInfo/RestaurantInfo.jsx`)
- Shows "Read-Only" in title for waiters
- Disables all input fields for waiters (`disabled={!canEdit}`)
- Hides "Save Changes" and "Cancel" buttons for waiters
- Displays info alert for waiters

## Protected Routes

Routes protected by `PermissionGuard`:
- `/waiters` - Requires `viewWaitersPage` permission
- `/restaurant/subscriptionplan` - Requires `viewSubscriptionPlan` permission

## User Experience

### WAITER Login Flow
1. Waiter receives email invite with registration link
2. Completes registration via `/waiter-register`
3. Signs in via `/auth`
4. Redirected to home page with waiter-specific welcome
5. Navigation shows only: Home, Dishes, Orders, Restaurant Info
6. All accessible pages show read-only content with helpful alerts

### Visual Indicators
- **Info Alerts**: Blue banner on read-only pages explaining limited access
- **Disabled Inputs**: Grayed-out form fields that cannot be edited
- **Title Changes**: Pages show "(Read-Only)" suffix for waiters
- **Hidden Buttons**: Edit/save buttons not visible to waiters

## Backend Integration

### Current Implementation Status

**Frontend (✅ Completed):**
- Permission checks in UI components
- Route guards for protected pages
- Role-based menu visibility
- Read-only mode for WAITER role

**Backend (📋 Planned):**
- GraphQL resolvers should verify role before executing mutations
- Query filtering based on user role (e.g., orders)

### Backend RBAC Design

#### Permission Model

**Core Principles:**
1. **Defense in Depth**: Frontend controls are UX-only; backend must independently validate
2. **Least Privilege**: Each role can only perform actions within their scope
3. **Unified Auth Context**: Leverage existing `identity` object from AppSync

#### Role-Based Permission Matrix

| Operation | BOSS | WAITER | Notes |
|-----------|------|--------|-------|
| **Dish Management** | | | |
| `listDishes` | ✅ | ✅ (read-only) | Both can view |
| `createDish` | ✅ | ❌ | BOSS only |
| `updateDish` | ✅ | ❌ | BOSS only |
| `deleteDish` | ✅ | ❌ | BOSS only |
| `updateDishAvailability` | ✅ | ❌ | BOSS only |
| **Dish Type Management** | | | |
| `listDishTypes` | ✅ | ✅ (read-only) | Both can view |
| `createDishType` | ✅ | ❌ | BOSS only |
| `updateDishType` | ✅ | ❌ | BOSS only |
| `deleteDishType` | ✅ | ❌ | BOSS only |
| **Restaurant Management** | | | |
| `getRestaurant` | ✅ | ✅ (read-only) | Both can view |
| `createRestaurant` | ✅ | ❌ | BOSS only |
| `updateRestaurantInfo` | ✅ | ❌ | BOSS only |
| `updateRestaurantSubscriptionPlan` | ✅ | ❌ | BOSS only |
| **Waiter Management** | | | |
| `inviteWaiter` | ✅ | ❌ | BOSS only |
| `deleteWaiter` | ✅ | ❌ | BOSS only |
| **Order Management** | | | |
| `placeOrder` | ✅ | ✅ | Both can create orders |
| `listOrders` | ✅ (all) | ✅ (own only) | Filtered by role |
| `updateOrderStatus` | ✅ | ❌ | BOSS only |
| `checkoutOrder` | ✅ | ❌ | BOSS only |

#### Implementation Strategy

**Step 1: Create Permission Helper Functions**

Add to `lambdas/emenu_server/index.mjs`:

```javascript
/**
 * Get user role from identity
 * @param {Object} identity - AppSync identity object
 * @returns {Promise<string>} - User role ('boss' or 'waiter')
 */
async function getUserRole(identity) {
  const cognitoId = identity.sub;
  const user = await User.findOne({ cognitoId, isDeleted: false });
  if (!user) throw new Error('User not found');
  return user.role; // 'boss' or 'waiter'
}

/**
 * Require user to have one of the allowed roles
 * @param {Object} identity - AppSync identity object
 * @param {Array<string>} allowedRoles - Array of allowed roles, e.g., ['boss']
 * @returns {Promise<string>} - User's role if authorized
 * @throws {Error} - If user doesn't have required role
 */
async function requireRole(identity, allowedRoles) {
  const role = await getUserRole(identity);
  if (!allowedRoles.includes(role)) {
    throw new Error(
      `PERMISSION_DENIED: Required role: ${allowedRoles.join(' or ')}, but you are: ${role}`
    );
  }
  return role;
}
```

**Step 2: Add Role Checks to Mutations**

Example implementation for dish management:

```javascript
// Dish Management - BOSS only
const createDish = async (args, identity) => {
  console.log('Executing createDish...');
  await requireRole(identity, ['boss']); // ⬅️ Add this check
  
  const restaurantId = await getRestaurantIdFromIdentity(identity);
  // ... rest of implementation
};

const updateDish = async (args, identity) => {
  console.log('Executing updateDish...');
  await requireRole(identity, ['boss']); // ⬅️ Add this check
  // ... rest of implementation
};

const deleteDish = async (args, identity) => {
  console.log('Executing deleteDish...');
  await requireRole(identity, ['boss']); // ⬅️ Add this check
  // ... rest of implementation
};

const updateDishAvailability = async (args, identity) => {
  console.log('Executing updateDishAvailability...');
  await requireRole(identity, ['boss']); // ⬅️ Add this check
  // ... rest of implementation
};
```

**Step 3: Implement Role-Based Query Filtering**

For `listOrders`, filter results based on role:

```javascript
const listOrders = async (event, identity) => {
  console.log('Executing listOrders...');
  const role = await getUserRole(identity); // ⬅️ Get user role
  const restaurantId = await getRestaurantIdFromIdentity(identity);
  const { status, dateFrom, dateTo } = event.arguments;
  
  const filter = { restaurantId, isDeleted: { $ne: true } };
  
  // WAITER can only see their own orders
  if (role === 'waiter') {
    const user = await User.findOne({ cognitoId: identity.sub });
    filter.waiterId = user._id; // ⬅️ Filter by waiter ID
    console.log(`Filtering orders for waiter: ${user._id}`);
  }
  // BOSS can see all orders (no additional filter)
  
  if (status) filter.status = status;
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }
  
  const orders = await Order.find(filter).populate('items').sort({ createdAt: -1 });
  return orders.map(o => o.toJSON());
};
```

#### Complete Mutation List Requiring Role Checks

**BOSS-only mutations (add `requireRole(identity, ['boss'])`)**:
- `createDish`
- `updateDish`
- `deleteDish`
- `updateDishAvailability`
- `createDishType`
- `updateDishType`
- `deleteDishType`
- `updateRestaurantInfo`
- `updateRestaurantSubscriptionPlan`
- `inviteWaiter`
- `deleteWaiter`
- `updateOrderStatus`
- `checkoutOrder`

**Both roles allowed (no role check needed)**:
- `placeOrder` - Both BOSS and WAITER can place orders
- `listDishes` - Both can view (read-only)
- `listDishTypes` - Both can view (read-only)
- `getRestaurant` - Both can view (read-only)

**Role-filtered queries**:
- `listOrders` - Add `waiterId` filter for WAITER role

### Error Handling

Backend should return consistent error messages:

```javascript
// Example error response
{
  "errors": [{
    "message": "PERMISSION_DENIED: Required role: boss, but you are: waiter",
    "errorType": "Lambda:Unhandled"
  }]
}
```

Frontend can catch and display user-friendly messages:
```javascript
if (error.message.includes('PERMISSION_DENIED')) {
  setError('You do not have permission to perform this action.');
}
```

## Security Considerations

1. **Defense in Depth**: 
   - Frontend checks provide good UX (hide/disable unavailable features)
   - Backend validation is mandatory for security (prevent API abuse)
   - Both layers work together for robust protection

2. **Role Storage and Verification**: 
   - User role stored in MongoDB User document (`role` field: 'boss' or 'waiter')
   - Frontend stores role in Redux (`state.user.role`)
   - Backend fetches role from database using `identity.sub` (Cognito ID)
   - Role normalization handles case variations for compatibility

3. **Authentication Flow**:
   - AppSync validates JWT token from Cognito
   - Lambda receives authenticated `identity` object
   - Backend queries User table by `cognitoId` (from `identity.sub`)
   - Role-based checks execute before business logic

4. **GraphQL Security**:
   - All mutations (except `registerWaiter`) require Cognito authentication
   - `registerWaiter` uses API Key auth (dedicated type `RegisterWaiterPayload`)
   - VTL response template propagates errors to frontend
   - IAM policies restrict Lambda's Cognito permissions

## Testing Checklist

### Frontend Testing

#### WAITER Role
- [ ] Navigation only shows: Home, Dishes, Orders, Restaurant Info
- [ ] Home page shows waiter-specific welcome and tablet app instructions
- [ ] Dishes page shows "Dishes (Read-Only)" title with info alert
- [ ] Restaurant Info page has disabled inputs and read-only banner
- [ ] Direct navigation to `/waiters` redirects to home
- [ ] Direct navigation to `/restaurant/subscriptionplan` redirects to home
- [ ] No create/edit/delete buttons visible on Dishes page
- [ ] User role displays as "Waiter" on home page

#### BOSS Role
- [ ] All navigation items visible (Home, Dishes, Orders, Restaurant Info, Waiters, Subscription Plan, Settings)
- [ ] Can create/edit/delete dishes
- [ ] Can invite and manage waiters
- [ ] Can update restaurant information
- [ ] Can manage subscription plan
- [ ] User role displays as "Restaurant Owner" on home page

### Backend Testing (Once Implemented)

#### WAITER Role - Permissions
- [ ] ✅ Can call `placeOrder` mutation
- [ ] ✅ Can call `listDishes` query
- [ ] ✅ Can call `listDishTypes` query
- [ ] ✅ Can call `getRestaurant` query
- [ ] ✅ Can call `listOrders` query (sees only own orders)
- [ ] ❌ Cannot call `createDish` (returns PERMISSION_DENIED)
- [ ] ❌ Cannot call `updateDish` (returns PERMISSION_DENIED)
- [ ] ❌ Cannot call `deleteDish` (returns PERMISSION_DENIED)
- [ ] ❌ Cannot call `updateDishAvailability` (returns PERMISSION_DENIED)
- [ ] ❌ Cannot call `createDishType` (returns PERMISSION_DENIED)
- [ ] ❌ Cannot call `updateDishType` (returns PERMISSION_DENIED)
- [ ] ❌ Cannot call `deleteDishType` (returns PERMISSION_DENIED)
- [ ] ❌ Cannot call `updateRestaurantInfo` (returns PERMISSION_DENIED)
- [ ] ❌ Cannot call `updateRestaurantSubscriptionPlan` (returns PERMISSION_DENIED)
- [ ] ❌ Cannot call `inviteWaiter` (returns PERMISSION_DENIED)
- [ ] ❌ Cannot call `updateOrderStatus` (returns PERMISSION_DENIED)
- [ ] ❌ Cannot call `checkoutOrder` (returns PERMISSION_DENIED)

#### BOSS Role - Permissions
- [ ] ✅ All mutations and queries succeed
- [ ] ✅ `listOrders` returns all restaurant orders

#### Order Filtering
- [ ] WAITER A can only see orders where `waiterId` matches their user ID
- [ ] WAITER A cannot see orders created by WAITER B
- [ ] BOSS can see all orders regardless of `waiterId`

## Future Enhancements

1. **Backend RBAC Completion**: 
  - Implement role checks in all BOSS-only mutations
  - Add order filtering by `waiterId` for WAITER role
  - Write integration tests for permission enforcement

2. **Audit Logging**: 
  - Track who made what changes (user ID, action, timestamp)
  - Store audit trail in dedicated collection
  - Display change history in admin UI

3. **More Granular Permissions**: 
  - Support for specific actions (e.g., "can_update_dish_price" vs "can_update_dish_availability")
  - Permission sets or profiles for easier management
  - Time-based permissions (e.g., temporary elevated access)

4. **Additional Roles**: 
  - MANAGER: Can edit dishes but not manage subscription
  - VIEWER: Read-only access to all data (for reporting/analytics)
  - CASHIER: Can checkout orders but not edit menu

5. **Role Management UI**: 
  - Allow BOSS to change waiter roles
  - Invite users with pre-assigned roles
  - Bulk role updates

6. **Enhanced Order Features**:
  - Waiters can update their own pending orders
  - Real-time order notifications
  - Order assignment to specific waiters

7. **Performance Optimization**:
  - Cache user role in JWT claims (custom Cognito attribute)
  - Avoid DB lookup for every permission check
  - Use AppSync field-level authorization directives

## Files Modified

### New Files
- `src/lib/permissions.js` - Permission configuration
- `src/components/guards/PermissionGuard.jsx` - Route guard component

### Modified Files
- `src/components/Navigation/Navigation.jsx` - Conditional menu rendering
- `src/pages/HomePage/HomePage.jsx` - Role-specific content
- `src/pages/DishManagerPage/DishManagerPage.jsx` - Read-only mode
- `src/pages/RestaurantInfo/RestaurantInfo.jsx` - Disabled inputs
- `src/pages/HomePage/HomePage.module.scss` - Waiter welcome styles
- `src/pages/DishManagerPage/DishManagerPage.module.scss` - Alert styles
- `src/pages/RestaurantInfo/RestaurantInfo.module.scss` - Alert and disabled styles
- `src/App.jsx` - Route guards

## Summary

The RBAC system provides comprehensive role-based access control with clear separation between BOSS and WAITER roles:

### Frontend (✅ Implemented)
- **UI Components**: Conditionally rendered based on permissions
- **Routes**: Protected with `PermissionGuard` component
- **Navigation**: Role-based menu visibility
- **UX**: Clear visual indicators (read-only banners, disabled inputs, info alerts)
- **Role Normalization**: Case-insensitive role handling for data compatibility

### Backend (📋 Design Complete, Implementation Pending)
- **Permission Model**: Well-defined permission matrix for all operations
- **Helper Functions**: `getUserRole()` and `requireRole()` for enforcement
- **Mutation Protection**: BOSS-only mutations clearly identified
- **Query Filtering**: Orders filtered by `waiterId` for WAITER role
- **Error Handling**: Consistent `PERMISSION_DENIED` error messages

### Security Architecture
1. **Defense in Depth**: Frontend UX + Backend validation
2. **Least Privilege**: Each role has minimum necessary permissions
3. **Unified Auth**: Leverages AppSync identity and Cognito authentication
4. **Audit Trail**: Foundation for tracking changes by user and role

This dual-layer approach ensures:
- Waiters can efficiently access features they need (dishes, orders, restaurant info)
- Unauthorized modifications are prevented at both UI and API levels
- Clear separation of responsibilities between BOSS and WAITER roles
- Data integrity and security maintained across the system
