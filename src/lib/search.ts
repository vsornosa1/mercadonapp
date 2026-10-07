import type { CatalogProduct } from '../types/catalog.ts';
import { normalizeText } from './normalize.ts';

// Deliberately simple: normalize both sides, then rank by match quality.
// Exact prefix > word-boundary prefix > substring, and name > brand > category.
// This meets the acceptance criteria (accent-insensitive, prefix-over-fuzzy)
// without a fuzzy-search dependency; see the Fuse.js deviation note in the plan.

const MAX_RESULTS = 50;

type Field = 'name' | 'brand' | 'category';

interface Scored {
  product: CatalogProduct;
  score: number;
}

function rank(query: string, product: CatalogProduct): number | null {
  const name = normalizeText(product.name);
  const brand = normalizeText(product.brand);
  const categories = product.categoryPath.map((c) => normalizeText(c.name));

  const scoreFor = (field: Field): number | null => {
    const value = field === 'name' ? name : field === 'brand' ? brand : '';
    if (field !== 'category') {
      if (value === query) return 0;
      if (value.startsWith(query)) return 1;
      if (value.includes(` ${query}`)) return 3;
      if (value.includes(query)) return 4;
      return null;
    }
    const exact = categories.findIndex((c) => c === query);
    if (exact >= 0) return 5;
    const starts = categories.findIndex((c) => c.startsWith(query));
    if (starts >= 0) return 6;
    const includes = categories.findIndex((c) => c.includes(query));
    if (includes >= 0) return 7;
    return null;
  };

  const base = { name: 0, brand: 10, category: 20 } as const;
  let best: number | null = null;
  for (const field of ['name', 'brand', 'category'] as const) {
    const s = scoreFor(field);
    if (s !== null) {
      const total = base[field] + s;
      if (best === null || total < best) best = total;
    }
  }
  return best;
}

export function search(query: string, products: readonly CatalogProduct[]): CatalogProduct[] {
  const q = normalizeText(query);
  if (q === '') return [];

  const scored: Scored[] = [];
  for (const product of products) {
    const score = rank(q, product);
    if (score !== null) scored.push({ product, score });
  }

  scored.sort((a, b) => a.score - b.score || a.product.name.localeCompare(b.product.name, 'es'));
  return scored.slice(0, MAX_RESULTS).map((s) => s.product);
}
