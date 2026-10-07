import type { CatalogProduct } from '../types/catalog.ts';
import { normalizeText } from './normalize.ts';

// Deliberately simple: normalize both sides, then rank by match quality.
// Exact prefix > word-boundary prefix > substring, and name > brand > category.
// Meets the acceptance criteria (accent-insensitive, prefix-over-fuzzy) without
// a fuzzy-search dependency; see the Fuse.js deviation note in the plan.

/** A pasted paragraph must not turn into dozens of full-catalogue scans. */
const MAX_TOKENS = 8;

type Field = 'name' | 'brand' | 'category';

interface Scored<T extends CatalogProduct> {
  product: T;
  score: number;
}

/**
 * Scores one token against one product. Lower is better, `null` means no match.
 * Callers summing tokens can therefore rank multi-word queries by total score.
 */
function rankToken(token: string, product: CatalogProduct): number | null {
  const name = normalizeText(product.name);
  const brand = normalizeText(product.brand);
  const categories = product.categoryPath.map((c) => normalizeText(c.name));

  const scoreFor = (field: Field): number | null => {
    if (field !== 'category') {
      const value = field === 'name' ? name : brand;
      if (value === '') return null;
      if (value === token) return 0;
      if (value.startsWith(token)) return 1;
      if (value.includes(` ${token}`)) return 3;
      if (value.includes(token)) return 4;
      return null;
    }
    const exact = categories.findIndex((c) => c === token);
    if (exact >= 0) return 5;
    const starts = categories.findIndex((c) => c.startsWith(token));
    if (starts >= 0) return 6;
    const includes = categories.findIndex((c) => c.includes(token));
    if (includes >= 0) return 7;
    return null;
  };

  const base = { name: 0, brand: 10, category: 20 } as const;
  let best: number | null = null;
  for (const field of ['name', 'brand', 'category'] as const) {
    const score = scoreFor(field);
    if (score !== null) {
      const total = base[field] + score;
      if (best === null || total < best) best = total;
    }
  }
  return best;
}

/**
 * Accent-insensitive search where **every** word must match somewhere in the
 * product (name, brand or category), so "natillas proteina" finds
 * "Natillas sabor vainilla +Proteínas 12 g" instead of nothing. Requiring all
 * words is what makes a partial phrase a miss rather than a weak hit.
 *
 * Returns *all* matches, ranked. Callers paginate, so truncating here would
 * both hide products and make the "N resultados" heading wrong.
 */
export function search<T extends CatalogProduct>(
  query: string,
  products: readonly T[],
): T[] {
  const tokens = normalizeText(query)
    .split(' ')
    .filter((token) => token !== '')
    .slice(0, MAX_TOKENS);
  if (tokens.length === 0) return [];

  const scored: Scored<T>[] = [];
  for (const product of products) {
    let total = 0;
    let matchedEveryToken = true;
    for (const token of tokens) {
      const score = rankToken(token, product);
      if (score === null) {
        matchedEveryToken = false;
        break;
      }
      total += score;
    }
    if (matchedEveryToken) scored.push({ product, score: total });
  }

  scored.sort((a, b) => a.score - b.score || a.product.name.localeCompare(b.product.name, 'es'));
  return scored.map((s) => s.product);
}
