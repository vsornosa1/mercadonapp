import { describe, expect, it } from 'vitest';

import type { Cart } from '../types/cart.ts';
import {
  addItem,
  clearCart,
  createCart,
  isInCart,
  loadCart,
  removeItem,
  saveCart,
  toggleChecked,
  CART_STORAGE_KEY,
} from './cart.ts';

const t0 = new Date('2026-10-06T12:00:00Z');

function storageWith(value: string | null) {
  const map = new Map<string, string>();
  if (value !== null) map.set(CART_STORAGE_KEY, value);
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, v: string) => void map.set(key, v),
  };
}

describe('cart mutations', () => {
  it('adds an item with checked false and a timestamp', () => {
    const cart = addItem(createCart(t0), 42, t0);
    expect(cart.items).toEqual([{ productId: 42, addedAt: t0.toISOString(), checked: false }]);
  });

  it('does not duplicate an already-added product (set semantics)', () => {
    const once = addItem(createCart(t0), 42, t0);
    const twice = addItem(once, 42, t0);
    expect(twice.items).toHaveLength(1);
  });

  it('removes a product and toggles checked', () => {
    let cart = addItem(createCart(t0), 1, t0);
    cart = addItem(cart, 2, t0);
    expect(removeItem(cart, 1, t0).items.map((i) => i.productId)).toEqual([2]);
    const toggled = toggleChecked(cart, 2, t0);
    expect(toggled.items.find((i) => i.productId === 2)?.checked).toBe(true);
  });

  it('clears the cart and reports membership', () => {
    const cart = addItem(createCart(t0), 7, t0);
    expect(isInCart(cart, 7)).toBe(true);
    expect(clearCart(t0).items).toEqual([]);
  });
});

describe('cart persistence', () => {
  it('round-trips a cart through storage', () => {
    const storage = storageWith(null);
    const cart = addItem(createCart(t0), 42, t0);
    saveCart(storage, cart);
    expect(loadCart(storage)).toEqual(cart);
  });

  it('returns an empty cart when nothing is stored', () => {
    expect(loadCart(storageWith(null), t0)).toEqual(createCart(t0));
  });

  it('degrades to an empty cart on corrupt JSON', () => {
    expect(loadCart(storageWith('{not json'), t0)).toEqual(createCart(t0));
  });

  it('degrades to an empty cart when items is not an array', () => {
    expect(loadCart(storageWith(JSON.stringify({ items: 'nope' })), t0)).toEqual(createCart(t0));
  });

  it('degrades to an empty cart when an item is malformed', () => {
    const bad: Cart = { items: [{ productId: 'x' as unknown as number, addedAt: '', checked: false }], updatedAt: '' };
    expect(loadCart(storageWith(JSON.stringify(bad)), t0)).toEqual(createCart(t0));
  });
});
