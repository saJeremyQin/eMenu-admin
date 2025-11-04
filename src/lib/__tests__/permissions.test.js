import { describe, it, expect } from 'vitest';
import { ROLES, PERMISSIONS } from '../permissions';

// Helper: run a matrix of roles (with different casings) through a permission fn
const cases = (fn) => ({
  boss: fn('boss'),
  BOSS: fn('BOSS'),
  waiter: fn('waiter'),
  WAITER: fn('WAITER'),
  undefined: fn(undefined),
  empty: fn(''),
  other: fn('other'),
});

describe('permissions: ROLES constants', () => {
  it('exports canonical lowercase role values', () => {
    expect(ROLES.BOSS).toBe('boss');
    expect(ROLES.WAITER).toBe('waiter');
  });
});

describe('permissions: navigation visibility and feature access', () => {
  it('viewWaitersPage allowed for boss only (case-insensitive)', () => {
    const r = cases(PERMISSIONS.viewWaitersPage);
    expect(r.boss).toBe(true);
    expect(r.BOSS).toBe(true);
    expect(r.waiter).toBe(false);
    expect(r.WAITER).toBe(false);
    expect(r.undefined).toBe(false);
  });

  it('viewSubscriptionPlan allowed for boss only', () => {
    const r = cases(PERMISSIONS.viewSubscriptionPlan);
    expect(r.boss && r.BOSS).toBe(true);
    expect(r.waiter || r.WAITER).toBe(false);
  });

  it('viewSettings allowed for boss only', () => {
    const r = cases(PERMISSIONS.viewSettings);
    expect(r.boss && r.BOSS).toBe(true);
    expect(r.waiter || r.WAITER).toBe(false);
  });

  it('viewDishes allowed for everyone (including undefined)', () => {
    const r = cases(PERMISSIONS.viewDishes);
    expect(r.boss && r.BOSS && r.waiter && r.WAITER).toBe(true);
    expect(r.undefined).toBe(true);
    expect(r.other).toBe(true);
  });

  it('create/edit/delete dish allowed for boss only', () => {
    const create = cases(PERMISSIONS.createDish);
    const edit = cases(PERMISSIONS.editDish);
    const del = cases(PERMISSIONS.deleteDish);
    const toggle = cases(PERMISSIONS.updateDishAvailability);

    for (const r of [create, edit, del, toggle]) {
      expect(r.boss && r.BOSS).toBe(true);
      expect(r.waiter || r.WAITER).toBe(false);
      expect(r.undefined).toBe(false);
    }
  });

  it('orders visibility: everyone can viewOrders', () => {
    const r = cases(PERMISSIONS.viewOrders);
    expect(r.boss && r.BOSS && r.waiter && r.WAITER).toBe(true);
    expect(r.undefined).toBe(true);
  });

  it('orders visibility: waiter can only viewOwnOrders; boss can viewAllOrders', () => {
    const own = cases(PERMISSIONS.viewOwnOrders);
    const all = cases(PERMISSIONS.viewAllOrders);

    expect(own.waiter && own.WAITER).toBe(true);
    expect(own.boss || own.BOSS).toBe(false);

    expect(all.boss && all.BOSS).toBe(true);
    expect(all.waiter || all.WAITER).toBe(false);
  });

  it('updateOrderStatus allowed for boss only', () => {
    const r = cases(PERMISSIONS.updateOrderStatus);
    expect(r.boss && r.BOSS).toBe(true);
    expect(r.waiter || r.WAITER).toBe(false);
    expect(r.undefined).toBe(false);
  });

  it('restaurant info: everyone can view, only boss can edit', () => {
    const view = cases(PERMISSIONS.viewRestaurantInfo);
    const edit = cases(PERMISSIONS.editRestaurantInfo);
    const plan = cases(PERMISSIONS.editSubscriptionPlan);

    expect(view.boss && view.BOSS && view.waiter && view.WAITER).toBe(true);
    expect(view.undefined).toBe(true);

    for (const r of [edit, plan]) {
      expect(r.boss && r.BOSS).toBe(true);
      expect(r.waiter || r.WAITER).toBe(false);
      expect(r.undefined).toBe(false);
    }
  });
});
