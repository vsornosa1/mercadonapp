import type { Cart, CartItem } from '../types/cart.ts';

export const CART_STORAGE_KEY = 'mercadonapp.cart.v1';

export function createCart(now: Date = new Date()): Cart {
  return { items: [], updatedAt: now.toISOString() };
}

export function addItem(cart: Cart, productId: number, now: Date = new Date()): Cart {
  if (isInCart(cart, productId)) return cart;
  const item: CartItem = { productId, addedAt: now.toISOString(), checked: false };
  return { items: [...cart.items, item], updatedAt: now.toISOString() };
}

export function removeItem(cart: Cart, productId: number, now: Date = new Date()): Cart {
  return {
    items: cart.items.filter((item) => item.productId !== productId),
    updatedAt: now.toISOString(),
  };
}

export function toggleChecked(cart: Cart, productId: number, now: Date = new Date()): Cart {
  return {
    items: cart.items.map((item) =>
      item.productId === productId ? { ...item, checked: !item.checked } : item,
    ),
    updatedAt: now.toISOString(),
  };
}

export function clearCart(now: Date = new Date()): Cart {
  return { items: [], updatedAt: now.toISOString() };
}

export function isInCart(cart: Cart, productId: number): boolean {
  return cart.items.some((item) => item.productId === productId);
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Loads the cart, degrading to an empty cart on any malformed stored value. */
export function loadCart(storage: StorageLike, now: Date = new Date()): Cart {
  try {
    const raw = storage.getItem(CART_STORAGE_KEY);
    if (!raw) return createCart(now);
    const parsed = JSON.parse(raw) as Cart;
    if (!Array.isArray(parsed.items)) return createCart(now);
    const valid = parsed.items.every(
      (item) => typeof item.productId === 'number' && typeof item.checked === 'boolean',
    );
    if (!valid) return createCart(now);
    return parsed;
  } catch {
    return createCart(now);
  }
}

export function saveCart(storage: StorageLike, cart: Cart): void {
  storage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}
