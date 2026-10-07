import type { CatalogProduct, EnrichedCatalogProduct } from '../types/catalog.ts';
import type { NovaGroup } from '../types/nutrition.ts';
import type { Reason, Swap } from '../types/swaps.ts';
import { extractENumbers } from './additives.ts';

// Per-product signals the ranking reasons over. Macro fields come from Open
// Food Facts; the additive count and codes come from Mercadona's ingredient
// text. null means "no data", and a null dimension is never compared.
export interface SwapSignals {
  additiveCount: number | null;
  additiveCodes: string[];
  novaGroup: NovaGroup | null;
  protein: number | null; // g per 100 g
  sugars: number | null;
  salt: number | null;
}

/**
 * Derives the ranking signals for an enriched product. A product with no
 * ingredient list gets additiveCount null — absence of data is not evidence
 * of zero additives.
 */
export function swapSignalsFor(product: EnrichedCatalogProduct): SwapSignals {
  const hasIngredients = !!product.ingredientsHtml && product.ingredientsHtml.trim() !== '';
  const codes = hasIngredients ? extractENumbers(product.ingredientsHtml!) : [];
  return {
    additiveCount: hasIngredients ? codes.length : null,
    additiveCodes: codes,
    novaGroup: product.nutrition.novaGroup,
    protein: product.nutrition.per100?.protein ?? null,
    sugars: product.nutrition.per100?.sugars ?? null,
    salt: product.nutrition.per100?.salt ?? null,
  };
}

type Dimension = 'additives' | 'nova' | 'protein' | 'sugars' | 'salt';

// Returns -1 if `a` is better on this dimension, +1 if worse, 0 if equal,
// null if the dimension is not comparable (missing data on either side).
export function compare(a: SwapSignals, b: SwapSignals, dimension: Dimension): -1 | 0 | 1 | null {
  switch (dimension) {
    case 'additives': {
      if (a.additiveCount == null || b.additiveCount == null) return null;
      return a.additiveCount < b.additiveCount ? -1 : a.additiveCount > b.additiveCount ? 1 : 0;
    }
    case 'nova': {
      if (a.novaGroup == null || b.novaGroup == null) return null;
      return a.novaGroup < b.novaGroup ? -1 : a.novaGroup > b.novaGroup ? 1 : 0;
    }
    case 'protein': {
      if (a.protein == null || b.protein == null) return null;
      return a.protein > b.protein ? -1 : a.protein < b.protein ? 1 : 0;
    }
    case 'sugars': {
      if (a.sugars == null || b.sugars == null) return null;
      return a.sugars < b.sugars ? -1 : a.sugars > b.sugars ? 1 : 0;
    }
    case 'salt': {
      if (a.salt == null || b.salt == null) return null;
      return a.salt < b.salt ? -1 : a.salt > b.salt ? 1 : 0;
    }
  }
}

const DIMENSIONS: Dimension[] = ['additives', 'nova', 'protein', 'sugars', 'salt'];

function reasonsFor(product: SwapSignals, candidate: SwapSignals): Reason[] {
  const reasons: Reason[] = [];
  if (product.additiveCount != null && candidate.additiveCount != null && candidate.additiveCount < product.additiveCount) {
    reasons.push({ kind: 'additives', from: product.additiveCount, to: candidate.additiveCount, detail: candidate.additiveCodes });
  }
  if (product.novaGroup != null && candidate.novaGroup != null && candidate.novaGroup < product.novaGroup) {
    reasons.push({ kind: 'nova', from: product.novaGroup, to: candidate.novaGroup });
  }
  if (product.protein != null && candidate.protein != null && candidate.protein > product.protein) {
    reasons.push({ kind: 'protein', from: product.protein, to: candidate.protein });
  }
  if (product.sugars != null && candidate.sugars != null && candidate.sugars < product.sugars) {
    reasons.push({ kind: 'sugars', from: product.sugars, to: candidate.sugars });
  }
  if (product.salt != null && candidate.salt != null && candidate.salt < product.salt) {
    reasons.push({ kind: 'salt', from: product.salt, to: candidate.salt });
  }
  return reasons;
}

/**
 * Names same-category products that are strictly better — better on at least
 * one comparable dimension and worse on none. An empty result is a valid,
 * honest answer: the caller says so rather than padding with near-equals.
 */
export function findSwaps(
  product: CatalogProduct,
  catalog: readonly CatalogProduct[],
  signals: ReadonlyMap<number, SwapSignals>,
  limit = 3,
): Swap[] {
  const productSignals = signals.get(product.id);
  if (!productSignals) return [];

  const candidates = catalog.filter(
    (candidate) => candidate.id !== product.id && candidate.leafCategoryId === product.leafCategoryId,
  );

  const swaps: Swap[] = [];
  for (const candidate of candidates) {
    const candidateSignals = signals.get(candidate.id);
    if (!candidateSignals) continue;

    const reasons = reasonsFor(productSignals, candidateSignals);
    if (reasons.length === 0) continue;

    // Pareto: the candidate must not be worse on any comparable dimension.
    let worse = false;
    for (const dimension of DIMENSIONS) {
      if (compare(candidateSignals, productSignals, dimension) === 1) {
        worse = true;
        break;
      }
    }
    if (worse) continue;

    // Score by preference order: additives > nova > protein > sugars > salt.
    const score = reasons.length;
    swaps.push({ product: candidate, reasons, score });
  }

  swaps.sort((a, b) => {
    const pa = signals.get(a.product.id)!;
    const pb = signals.get(b.product.id)!;
    for (const dimension of DIMENSIONS) {
      const cmp = compare(pa, pb, dimension);
      if (cmp !== null && cmp !== 0) return cmp;
    }
    return a.product.id - b.product.id;
  });

  return swaps.slice(0, limit);
}
