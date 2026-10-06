import type { CatalogProduct } from './catalog';

export type Reason =
  | { kind: 'additives'; from: number; to: number; detail: string[] }
  | { kind: 'nova'; from: 1 | 2 | 3 | 4; to: 1 | 2 | 3 | 4 }
  | { kind: 'protein'; from: number; to: number } // g per 100 g
  | { kind: 'sugars'; from: number; to: number }
  | { kind: 'salt'; from: number; to: number };

export interface Swap {
  product: CatalogProduct;
  reasons: Reason[]; // never empty — a swap with no reason is not a swap
  score: number;
}
