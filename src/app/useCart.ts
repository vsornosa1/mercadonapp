import { useCallback, useEffect, useState } from 'react';

import {
  addItem,
  clearCart,
  loadCart,
  removeItem,
  saveCart,
  toggleChecked,
  type StorageLike,
} from '../lib/cart.ts';
import type { Cart } from '../types/cart.ts';

const storage: StorageLike = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};

/** The cart is a set persisted to localStorage, written through on mutation. */
export function useCart() {
  const [cart, setCart] = useState<Cart>(() => loadCart(storage));

  useEffect(() => {
    saveCart(storage, cart);
  }, [cart]);

  const add = useCallback((productId: number) => setCart((c) => addItem(c, productId)), []);
  const remove = useCallback((productId: number) => setCart((c) => removeItem(c, productId)), []);
  const toggle = useCallback((productId: number) => setCart((c) => toggleChecked(c, productId)), []);
  const clear = useCallback(() => setCart(() => clearCart()), []);

  return { cart, add, remove, toggle, clear };
}
