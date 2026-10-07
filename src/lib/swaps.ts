import type { EnrichedCatalogProduct } from '../types/catalog.ts';
import type { NovaGroup, ProcessingTier } from '../types/nutrition.ts';
import type { Reason, Swap, TradeOff, MacroReasonKind } from '../types/swaps.ts';
import { extractENumbers } from './additives.ts';

/**
 * Per-product signals the ranking reasons over. Macro fields come from Open
 * Food Facts, the additive count from Mercadona's ingredient text, and `tier`
 * is **the composed signal the UI displays** — the ranking must reason about
 * the same badge the user sees, or it will recommend a product its own screen
 * calls more processed. `null` means "no data"; a null dimension is never compared.
 */
export interface SwapSignals {
  tier: ProcessingTier;
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
    tier: product.processing.tier,
    additiveCount: hasIngredients ? codes.length : null,
    additiveCodes: codes,
    novaGroup: product.nutrition.novaGroup,
    protein: product.nutrition.per100?.protein ?? null,
    sugars: product.nutrition.per100?.sugars ?? null,
    salt: product.nutrition.per100?.salt ?? null,
  };
}

/** Builds the per-product signals map the ranking consumes, once per catalogue. */
export function buildSwapSignals(
  products: readonly EnrichedCatalogProduct[],
): Map<number, SwapSignals> {
  const map = new Map<number, SwapSignals>();
  for (const product of products) {
    map.set(product.id, swapSignalsFor(product));
  }
  return map;
}

export type Dimension = 'tier' | 'additives' | 'nova' | 'protein' | 'sugars' | 'salt';

/**
 * Tier ranking. `null` for `unknown` on purpose: we do not know that product's
 * processing, so it must never count as an improvement over a known tier — and
 * never as a regression either.
 */
const TIER_COMPARABLE: Record<ProcessingTier, number | null> = {
  whole: 0,
  processed: 1,
  'ultra-processed': 2,
  unknown: null,
};

/** Ordering key only: `unknown` sorts last so a known tier wins a tie. */
const TIER_SORT: Record<ProcessingTier, number> = {
  whole: 0,
  processed: 1,
  'ultra-processed': 2,
  unknown: 3,
};

/** Dimensions that represent a processing improvement rather than a macro one. */
const PROCESSING_DIMENSIONS: ReadonlySet<Dimension> = new Set(['tier', 'additives', 'nova']);

/** Macro dimensions only — the ones a disclosed trade-off is allowed to touch. */
const MACRO_DIMENSIONS: readonly MacroReasonKind[] = ['protein', 'sugars', 'salt'];

// Returns -1 if `a` is better on this dimension, +1 if worse, 0 if equal,
// null if the dimension is not comparable (missing data on either side).
export function compare(a: SwapSignals, b: SwapSignals, dimension: Dimension): -1 | 0 | 1 | null {
  switch (dimension) {
    case 'tier': {
      const av = TIER_COMPARABLE[a.tier];
      const bv = TIER_COMPARABLE[b.tier];
      if (av === null || bv === null) return null;
      return av < bv ? -1 : av > bv ? 1 : 0;
    }
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

function reasonsFor(product: SwapSignals, candidate: SwapSignals): Reason[] {
  const reasons: Reason[] = [];

  if (compare(candidate, product, 'tier') === -1) {
    reasons.push({ kind: 'tier', from: product.tier, to: candidate.tier });
  }
  if (
    product.additiveCount != null &&
    candidate.additiveCount != null &&
    candidate.additiveCount < product.additiveCount
  ) {
    reasons.push({
      kind: 'additives',
      from: product.additiveCount,
      to: candidate.additiveCount,
      detail: candidate.additiveCodes,
    });
  }
  if (
    product.novaGroup != null &&
    candidate.novaGroup != null &&
    candidate.novaGroup < product.novaGroup
  ) {
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

/** The comparable macro dimensions on which the candidate is worse than the original. */
function macroRegressionsFor(product: SwapSignals, candidate: SwapSignals): MacroReasonKind[] {
  const worse: MacroReasonKind[] = [];
  for (const dimension of MACRO_DIMENSIONS) {
    if (compare(candidate, product, dimension) === 1) worse.push(dimension);
  }
  return worse;
}

/** True if the candidate is worse on any processing dimension — always disqualifying. */
function regressesOnProcessing(product: SwapSignals, candidate: SwapSignals): boolean {
  for (const dimension of PROCESSING_DIMENSIONS) {
    if (compare(candidate, product, dimension) === 1) return true;
  }
  return false;
}

function valueOf(signals: SwapSignals, dimension: MacroReasonKind): number {
  switch (dimension) {
    case 'protein':
      return signals.protein!;
    case 'sugars':
      return signals.sugars!;
    case 'salt':
      return signals.salt!;
  }
}

function toTradeOff(
  dimension: MacroReasonKind,
  product: SwapSignals,
  candidate: SwapSignals,
): TradeOff {
  return {
    kind: dimension,
    from: valueOf(product, dimension),
    to: valueOf(candidate, dimension),
  };
}

/** Deterministic ordering: processing first (unknown last), then additives, then macros. */
function ordering(a: SwapSignals, b: SwapSignals): number {
  if (TIER_SORT[a.tier] !== TIER_SORT[b.tier]) return TIER_SORT[a.tier] - TIER_SORT[b.tier];

  const aAdd = a.additiveCount ?? Number.POSITIVE_INFINITY;
  const bAdd = b.additiveCount ?? Number.POSITIVE_INFINITY;
  if (aAdd !== bAdd) return aAdd - bAdd;

  const aNova = a.novaGroup ?? Number.POSITIVE_INFINITY;
  const bNova = b.novaGroup ?? Number.POSITIVE_INFINITY;
  if (aNova !== bNova) return aNova - bNova;

  const aProtein = a.protein ?? Number.NEGATIVE_INFINITY;
  const bProtein = b.protein ?? Number.NEGATIVE_INFINITY;
  if (aProtein !== bProtein) return bProtein - aProtein;

  const aSugars = a.sugars ?? Number.POSITIVE_INFINITY;
  const bSugars = b.sugars ?? Number.POSITIVE_INFINITY;
  if (aSugars !== bSugars) return aSugars - bSugars;

  const aSalt = a.salt ?? Number.POSITIVE_INFINITY;
  const bSalt = b.salt ?? Number.POSITIVE_INFINITY;
  return aSalt - bSalt;
}

/**
 * Names same-category products that are better — better on at least one
 * comparable dimension, and giving up **at most one** other dimension, which is
 * returned as a disclosed `cost`.
 *
 * A regression is only acceptable when a processing dimension justifies it
 * (tier, additives or NOVA). That keeps macro-only swaps as pure improvements
 * and stops the app dressing up "more protein, more salt" as healthier.
 *
 * An empty result is a valid, honest answer: the caller says so rather than
 * padding with near-equals.
 */
export function findSwaps(
  product: EnrichedCatalogProduct,
  catalog: readonly EnrichedCatalogProduct[],
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

    // A processing regression is never acceptable: the app's whole thesis is
    // fewer ultraprocesados, so it must not recommend something MORE processed.
    if (regressesOnProcessing(productSignals, candidateSignals)) continue;

    // Macros may be traded off — at most one, and only when a processing
    // improvement justifies it. "More protein, more salt" is not healthier.
    const macroRegressions = macroRegressionsFor(productSignals, candidateSignals);
    if (macroRegressions.length > 1) continue;

    const hasProcessingReason = reasons.some((reason) => PROCESSING_DIMENSIONS.has(reason.kind));
    if (macroRegressions.length === 1 && !hasProcessingReason) continue;

    const cost =
      macroRegressions.length === 1
        ? toTradeOff(macroRegressions[0]!, productSignals, candidateSignals)
        : null;

    swaps.push({ product: candidate, reasons, cost, score: reasons.length });
  }

  swaps.sort((a, b) => {
    const pa = signals.get(a.product.id)!;
    const pb = signals.get(b.product.id)!;
    return ordering(pa, pb) || a.product.id - b.product.id;
  });

  return swaps.slice(0, limit);
}
