import { describe, expect, it } from 'vitest';

import type { CatalogProduct } from '../types/catalog.ts';
import { findSwaps, type SwapSignals } from './swaps.ts';

function product(id: number, leafCategoryId: number): CatalogProduct {
  return {
    id,
    ean: String(id),
    slug: 'x',
    name: `Producto ${id}`,
    brand: '',
    categoryPath: [],
    leafCategoryId,
    thumbnail: '',
    photo: '',
    unitPrice: 1,
    bulkPrice: null,
    unitSize: '',
    packaging: null,
    ingredientsHtml: null,
    allergensHtml: null,
    isVariableWeight: false,
    shareUrl: '',
  };
}

const yogurt = (): SwapSignals => ({
  additiveCount: 3,
  additiveCodes: ['407', '460', '466'],
  novaGroup: 4,
  protein: 3,
  sugars: 12,
  salt: 0.2,
});

const signals = new Map<number, SwapSignals>([
  [1, yogurt()],
  [2, { additiveCount: 0, additiveCodes: [], novaGroup: 1, protein: 9, sugars: 4, salt: 0.1 }],
  [3, { additiveCount: 3, additiveCodes: ['407'], novaGroup: 4, protein: 3, sugars: 20, salt: 0.3 }],
  [4, { additiveCount: 5, additiveCodes: ['407', '460', '466', '330', '621'], novaGroup: 4, protein: 2, sugars: 15, salt: 0.4 }],
  [5, { additiveCount: null, additiveCodes: [], novaGroup: null, protein: null, sugars: null, salt: null }],
]);

const catalog = [product(1, 10), product(2, 10), product(3, 10), product(4, 10), product(5, 10), product(6, 99)];

describe('findSwaps', () => {
  it('returns strictly-better same-category alternatives with reasons', () => {
    const swaps = findSwaps(product(1, 10), catalog, signals);
    expect(swaps.map((s) => s.product.id)).toContain(2);
    const better = swaps.find((s) => s.product.id === 2)!;
    expect(better.reasons.map((r) => r.kind)).toEqual(
      expect.arrayContaining(['additives', 'nova', 'protein', 'sugars', 'salt']),
    );
  });

  it('excludes a candidate that is worse on any comparable dimension', () => {
    // id 4 has MORE additives than id 1, so it must not appear.
    const swaps = findSwaps(product(1, 10), catalog, signals);
    expect(swaps.map((s) => s.product.id)).not.toContain(4);
  });

  it('never returns a product from a different leaf category', () => {
    const swaps = findSwaps(product(1, 10), catalog, signals);
    expect(swaps.map((s) => s.product.id)).not.toContain(6);
  });

  it('does not rank a product with no signals', () => {
    // id 5 has all-null signals; it cannot win any reason and must be skipped.
    const swaps = findSwaps(product(1, 10), catalog, signals);
    expect(swaps.map((s) => s.product.id)).not.toContain(5);
  });

  it('returns an empty list when nothing is strictly better', () => {
    // A catalogue whose only peer is worse on every dimension.
    const only = new Map<number, SwapSignals>([
      [1, yogurt()],
      [4, { additiveCount: 5, additiveCodes: [], novaGroup: 4, protein: 2, sugars: 15, salt: 0.4 }],
    ]);
    expect(findSwaps(product(1, 10), [product(1, 10), product(4, 10)], only)).toEqual([]);
  });

  it('is deterministic for identical inputs', () => {
    const a = findSwaps(product(1, 10), catalog, signals);
    const b = findSwaps(product(1, 10), catalog, signals);
    expect(a).toEqual(b);
  });

  it('respects the limit', () => {
    expect(findSwaps(product(1, 10), catalog, signals, 1)).toHaveLength(1);
  });
});
