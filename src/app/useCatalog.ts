import { useEffect, useState } from 'react';

import type { CatalogProduct } from '../types/catalog.ts';

export type CatalogStatus = 'loading' | 'ready' | 'error';

interface CatalogState {
  products: CatalogProduct[];
  status: CatalogStatus;
}

/** Loads the emitted catalogue bundle once, exposing loading/ready/error. */
export function useCatalog(): CatalogState {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [status, setStatus] = useState<CatalogStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const response = await fetch('/catalog/products.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as CatalogProduct[];
        if (!cancelled) {
          setProducts(data);
          setStatus('ready');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { products, status };
}
