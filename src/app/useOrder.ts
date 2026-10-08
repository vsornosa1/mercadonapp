import { useCallback, useEffect, useState } from 'react';

import { loadOrder, saveOrder, type OrderPreference, type StorageLike } from '../lib/ordering.ts';

const storage: StorageLike = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};

/** The order preference is written through to storage on every change. */
export function useOrder() {
  const [order, setOrder] = useState<OrderPreference>(() => loadOrder(storage));

  useEffect(() => {
    saveOrder(storage, order);
  }, [order]);

  const change = useCallback((next: OrderPreference) => setOrder(next), []);

  return { order, change };
}
