import type { RawProduct } from './summarize.ts';

export type ProductGroup = 'hacendado' | 'non-food-own' | 'other-brand' | 'unbranded';

const NON_FOOD_OWN_BRANDS = new Set(['Deliplus', 'Bosque Verde']);

export function classifyProduct(product: RawProduct): ProductGroup {
  const brand = product.brand;
  if (brand === 'Hacendado') return 'hacendado';
  if (brand && NON_FOOD_OWN_BRANDS.has(brand)) return 'non-food-own';
  if (!brand) return 'unbranded';
  return 'other-brand';
}

export interface OffSignals {
  found: boolean;
  hasKcal: boolean;
  hasProtein: boolean;
  hasNova: boolean;
}

/** Extracts only presence signals from an Open Food Facts v2 product response. */
export function extractOffSignals(json: unknown): OffSignals {
  const obj = json as {
    status?: unknown;
    product?: { nutriments?: Record<string, unknown>; nova_group?: unknown };
  };
  const found = obj.status === 1 || obj.status === '1';
  if (!found) {
    return { found: false, hasKcal: false, hasProtein: false, hasNova: false };
  }
  const nutriments = obj.product?.nutriments ?? {};
  return {
    found: true,
    hasKcal: nutriments['energy-kcal_100g'] != null,
    hasProtein: nutriments['proteins_100g'] != null,
    hasNova: obj.product?.nova_group != null,
  };
}

/** Deterministic PRNG so the coverage spike is reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A seeded, duplicate-free sample of exactly n items (or the whole input). */
export function seededTake<T>(items: readonly T[], seed: number, n: number): T[] {
  const indices = Array.from(items, (_, i) => i);
  const rand = mulberry32(seed);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = indices[i]!;
    indices[i] = indices[j]!;
    indices[j] = tmp;
  }
  return indices.slice(0, Math.min(n, items.length)).map((i) => items[i]!);
}
