# Waiter Role-Based Access Control (RBAC) Implementation

## Overview

This document describes the role-based permission system implemented for the eMenu Admin application, specifically focusing on the WAITER role with limited read-only access compared to the OWNER role.

## Roles

### OWNER (Restaurant Owner)
- Full access to all features
- Can create, edit, and delete dishes
- Can invite and manage waiters
- Can modify restaurant information
- Can manage subscription plans

### WAITER (Restaurant Staff)
- Limited read-only access
- Can view dishes (cannot create/edit/delete)
- Can view orders (only their own orders)
- Can view restaurant information (read-only)
- Cannot access waiters management
- Cannot access subscription plans
- Cannot access settings

## Implementation Components

### 1. Permission Configuration (`src/lib/permissions.js`)

Central permissions file defining:
- Role constants: `ROLES.OWNER`, `ROLES.WAITER`
- Permission functions for each feature
- Helper function `hasPermission(permission, role)`
- Role name formatter `getRoleName(role)`

```javascript
// Example usage
import { hasPermission, ROLES } from '../../lib/permissions';

const canEdit = hasPermission('editDish', userRole);
const isWaiter = userRole === ROLES.WAITER;
```

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
- Waiters navigation: Hidden items:
  - Waiters page
  - Subscription Plan
  - Settings

#### HomePage (`src/pages/HomePage/HomePage.jsx`)
- Different welcome messages for OWNER vs WAITER
- Waiter-specific instructions for using tablet app
- Lists accessible features based on role

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

### Current State
- Frontend permission checks are in place
- Backend GraphQL resolvers should verify role before mutations

### Recommended Backend Changes
1. Add role-based authorization in Lambda resolvers
2. Reject mutations from WAITER role:
   - `createDish`, `updateDish`, `deleteDish`
   - `updateRestaurantInfo`
   - `updateRestaurantSubscriptionPlan`
   - `inviteWaiter`
3. Filter `listOrders` query to return only waiter's own orders

### Example Backend Check
```javascript
// In Lambda resolver
const identity = event.identity;
const userRole = identity.claims?.['custom:role']; // or from DB

if (fieldName === 'updateDish' && userRole === 'WAITER') {
  throw new Error('PERMISSION_DENIED: Waiters cannot edit dishes');
}
```

## Security Considerations

1. **Defense in Depth**: Frontend checks are for UX; backend must also validate
2. **Role Storage**: User role stored in:
   - MongoDB User document (`role` field)
   - Redux store (`state.user.role`)
   - Could be added to Cognito custom attributes for easier access
3. **Token-based**: Role should be included in JWT claims for backend validation

## Testing Checklist

### WAITER Role Testing
- [ ] Navigation only shows: Home, Dishes, Orders, Restaurant Info
- [ ] Home page shows tablet app instructions
- [ ] Dishes page is read-only with info alert
- [ ] Restaurant Info page has disabled inputs
- [ ] Direct navigation to `/waiters` redirects to home
- [ ] Direct navigation to `/restaurant/subscriptionplan` redirects to home

### OWNER Role Testing
- [ ] All navigation items visible
- [ ] Can create/edit dishes
- [ ] Can invite waiters
- [ ] Can update restaurant info
- [ ] Can manage subscription

## Future Enhancements

1. **Orders Filtering**: Implement waiter-specific order filtering in backend
2. **Audit Logging**: Track who made what changes
3. **More Granular Permissions**: Add permissions for specific actions
4. **Role Management UI**: Allow owner to change user roles
5. **Permission Groups**: Support multiple permission sets (e.g., MANAGER role)

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

The RBAC system provides a clean separation between OWNER and WAITER roles:
- **Frontend**: UI elements conditionally rendered based on permissions
- **Routes**: Protected with permission guards
- **UX**: Clear visual indicators for read-only access
- **Backend (recommended)**: Mutations should validate role before execution

This approach ensures waiters can access the information they need while preventing unauthorized modifications, maintaining data integrity and security.
