import { describe, expect, it } from 'vitest';

import type { EnrichedCatalogProduct } from '../types/catalog.ts';
import type { ProcessingTier } from '../types/nutrition.ts';
import { compare, findSwaps, type SwapSignals } from './swaps.ts';

function product(id: number, name: string, leafCategoryId = 10): EnrichedCatalogProduct {
  return {
    id,
    ean: String(id),
    slug: 'x',
    name,
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
    nutrition: { source: 'none', per100: null, novaGroup: null, additives: [] },
    processing: { basis: 'ingredient-heuristic', tier: 'unknown', additiveMarkers: [] },
  };
}

interface SignalInput {
  tier?: ProcessingTier;
  additives?: number | null;
  nova?: 1 | 2 | 3 | 4 | null;
  protein?: number | null;
  sugars?: number | null;
  salt?: number | null;
}

function signals(entries: Record<number, SignalInput>): Map<number, SwapSignals> {
  const map = new Map<number, SwapSignals>();
  for (const [id, input] of Object.entries(entries)) {
    map.set(Number(id), {
      tier: input.tier ?? 'unknown',
      additiveCount: input.additives === undefined ? null : input.additives,
      additiveCodes: input.additives ? ['407'] : [],
      novaGroup: input.nova === undefined ? null : input.nova,
      protein: input.protein === undefined ? null : input.protein,
      sugars: input.sugars === undefined ? null : input.sugars,
      salt: input.salt === undefined ? null : input.salt,
    });
  }
  return map;
}

describe('compare — tier dimension', () => {
  const whole = signals({ 1: { tier: 'whole' } }).get(1)!;
  const ultra = signals({ 1: { tier: 'ultra-processed' } }).get(1)!;
  const unknown = signals({ 1: { tier: 'unknown' } }).get(1)!;

  it('ranks whole better than processed better than ultra-processed', () => {
    const processed = signals({ 1: { tier: 'processed' } }).get(1)!;
    expect(compare(whole, processed, 'tier')).toBe(-1);
    expect(compare(processed, ultra, 'tier')).toBe(-1);
    expect(compare(whole, ultra, 'tier')).toBe(-1);
    expect(compare(ultra, whole, 'tier')).toBe(1);
  });

  it('treats equal tiers as equal', () => {
    expect(compare(whole, whole, 'tier')).toBe(0);
  });

  it('treats unknown as NOT comparable — it is neither better nor worse', () => {
    expect(compare(unknown, whole, 'tier')).toBeNull();
    expect(compare(whole, unknown, 'tier')).toBeNull();
    expect(compare(unknown, ultra, 'tier')).toBeNull();
  });
});

describe('compare — the other dimensions', () => {
  const base = signals({ 1: { additives: 2, nova: 3, protein: 5, sugars: 10, salt: 0.2 } }).get(1)!;

  it('additives: fewer is better, more is worse, equal is equal', () => {
    const fewer = signals({ 1: { additives: 0 } }).get(1)!;
    const more = signals({ 1: { additives: 5 } }).get(1)!;
    expect(compare(fewer, base, 'additives')).toBe(-1);
    expect(compare(more, base, 'additives')).toBe(1);
    expect(compare(base, base, 'additives')).toBe(0);
  });

  it('nova: a lower group is better', () => {
    const lower = signals({ 1: { nova: 1 } }).get(1)!;
    const higher = signals({ 1: { nova: 4 } }).get(1)!;
    expect(compare(lower, base, 'nova')).toBe(-1);
    expect(compare(higher, base, 'nova')).toBe(1);
    expect(compare(base, base, 'nova')).toBe(0);
  });

  it('protein: more is better — the direction is inverted', () => {
    const more = signals({ 1: { protein: 9 } }).get(1)!;
    const less = signals({ 1: { protein: 1 } }).get(1)!;
    expect(compare(more, base, 'protein')).toBe(-1);
    expect(compare(less, base, 'protein')).toBe(1);
    expect(compare(base, base, 'protein')).toBe(0);
  });

  it('sugars: less is better', () => {
    const less = signals({ 1: { sugars: 2 } }).get(1)!;
    const more = signals({ 1: { sugars: 20 } }).get(1)!;
    expect(compare(less, base, 'sugars')).toBe(-1);
    expect(compare(more, base, 'sugars')).toBe(1);
    expect(compare(base, base, 'sugars')).toBe(0);
  });

  it('salt: less is better', () => {
    const less = signals({ 1: { salt: 0.05 } }).get(1)!;
    const more = signals({ 1: { salt: 1 } }).get(1)!;
    expect(compare(less, base, 'salt')).toBe(-1);
    expect(compare(more, base, 'salt')).toBe(1);
    expect(compare(base, base, 'salt')).toBe(0);
  });

  it('returns null on every dimension when a side has no data', () => {
    const noData = signals({ 1: {} }).get(1)!;
    for (const dimension of ['additives', 'nova', 'protein', 'sugars', 'salt'] as const) {
      expect(compare(noData, base, dimension), dimension).toBeNull();
      expect(compare(base, noData, dimension), dimension).toBeNull();
    }
  });
});

describe('findSwaps — the reported defect', () => {
  it('NEVER recommends a product whose displayed tier is worse', () => {
    // Reproduces the real case: "Leche desnatada" (whole, no NOVA) was recommended
    // over by "Leche desnatada +Proteínas" (processed, no NOVA) on protein alone.
    const original = product(1, 'Leche desnatada');
    const moreProtein = product(2, 'Leche desnatada +Proteínas');
    const map = signals({
      1: { tier: 'whole', additives: 0, protein: 3.1 },
      2: { tier: 'processed', additives: 0, protein: 5.2 },
    });

    expect(findSwaps(original, [original, moreProtein], map)).toEqual([]);
  });

  it('still recommends a better-tier product when nothing else is comparable', () => {
    const original = product(1, 'Refresco');
    const better = product(2, 'Agua');
    const map = signals({
      1: { tier: 'ultra-processed', additives: 2, nova: 4 },
      2: { tier: 'whole', additives: null, nova: 1 },
    });

    const swaps = findSwaps(original, [original, better], map);
    expect(swaps).toHaveLength(1);
    expect(swaps[0]!.product.id).toBe(2);
  });
});

describe('findSwaps — tier is an expressible reason', () => {
  it('emits a tier reason when the tier improves, even with nothing else comparable', () => {
    // The 216-case class: the improvement is real but no macro/additive differs.
    const original = product(1, 'Café en cápsula');
    const better = product(2, 'Café en grano');
    const map = signals({
      1: { tier: 'ultra-processed', additives: 0, protein: 0, sugars: 0, salt: 0 },
      2: { tier: 'whole', additives: 0, protein: 0, sugars: 0, salt: 0 },
    });

    const swaps = findSwaps(original, [original, better], map);
    expect(swaps).toHaveLength(1);
    expect(swaps[0]!.reasons).toEqual([{ kind: 'tier', from: 'ultra-processed', to: 'whole' }]);
  });

  it('never emits a tier reason involving unknown', () => {
    const original = product(1, 'A');
    const candidate = product(2, 'B');
    const map = signals({ 1: { tier: 'unknown', additives: 2 }, 2: { tier: 'whole', additives: 0 } });

    const swaps = findSwaps(original, [original, candidate], map);
    expect(swaps[0]!.reasons.some((r) => r.kind === 'tier')).toBe(false);
    expect(swaps[0]!.reasons.map((r) => r.kind)).toEqual(['additives']);
  });
});

describe('findSwaps — disclosed trade-offs', () => {
  it('offers a less-processed product with ONE macro regression, disclosing the cost', () => {
    const original = product(1, 'Yogur azucarado');
    const better = product(2, 'Yogur natural');
    const map = signals({
      1: { tier: 'ultra-processed', additives: 3, nova: 4, protein: 3, sugars: 12, salt: 0.2 },
      2: { tier: 'whole', additives: 0, nova: 1, protein: 3, sugars: 14, salt: 0.2 },
    });

    const swaps = findSwaps(original, [original, better], map);
    expect(swaps).toHaveLength(1);
    expect(swaps[0]!.cost).toEqual({ kind: 'sugars', from: 12, to: 14 });
    expect(swaps[0]!.reasons.some((r) => r.kind === 'tier')).toBe(true);
  });

  it('rejects a candidate with TWO regressions — that is a different product, not a trade-off', () => {
    const original = product(1, 'A');
    const better = product(2, 'B');
    const map = signals({
      1: { tier: 'ultra-processed', additives: 3, sugars: 12, salt: 0.2 },
      2: { tier: 'whole', additives: 0, sugars: 14, salt: 0.4 },
    });

    expect(findSwaps(original, [original, better], map)).toEqual([]);
  });

  it('rejects a macro trade-off that buys no processing improvement', () => {
    const original = product(1, 'A');
    const other = product(2, 'B');
    const map = signals({
      1: { tier: 'processed', additives: 1, protein: 5, salt: 0.1 },
      2: { tier: 'processed', additives: 1, protein: 6, salt: 0.3 },
    });

    expect(findSwaps(original, [original, other], map)).toEqual([]);
  });

  it('rejects a candidate that is worse on the TIER, even when it is better on additives', () => {
    // A processing regression is never a disclosed trade-off — the app must not
    // recommend something its own badge calls more processed.
    const original = product(1, 'A');
    const candidate = product(2, 'B');
    const map = signals({
      1: { tier: 'whole', additives: 4 },
      2: { tier: 'ultra-processed', additives: 0 },
    });

    expect(findSwaps(original, [original, candidate], map)).toEqual([]);
  });

  it('rejects a candidate that is worse on ADDITIVES, even when the tier improves', () => {
    const original = product(1, 'A');
    const candidate = product(2, 'B');
    const map = signals({
      1: { tier: 'processed', additives: 0 },
      2: { tier: 'whole', additives: 3 },
    });

    expect(findSwaps(original, [original, candidate], map)).toEqual([]);
  });

  it('rejects a candidate that is worse on NOVA, even when the tier improves', () => {
    const original = product(1, 'A');
    const candidate = product(2, 'B');
    const map = signals({
      1: { tier: 'processed', nova: 3 },
      2: { tier: 'whole', nova: 4 },
    });

    expect(findSwaps(original, [original, candidate], map)).toEqual([]);
  });

  it('allows at most one MACRO regression, and only as a disclosed cost', () => {
    const original = product(1, 'A');
    const candidate = product(2, 'B');
    const map = signals({
      1: { tier: 'ultra-processed', additives: 3, protein: 5, sugars: 10, salt: 0.2 },
      2: { tier: 'whole', additives: 0, protein: 5, sugars: 12, salt: 0.2 },
    });

    const swaps = findSwaps(original, [original, candidate], map);
    expect(swaps).toHaveLength(1);
    expect(swaps[0]!.cost).toEqual({ kind: 'sugars', from: 10, to: 12 });
  });

  it('leaves cost null when the candidate is better on every dimension', () => {
    const original = product(1, 'A');
    const better = product(2, 'B');
    const map = signals({
      1: { tier: 'ultra-processed', additives: 3, protein: 2, sugars: 12, salt: 0.4 },
      2: { tier: 'whole', additives: 0, protein: 9, sugars: 2, salt: 0.1 },
    });

    expect(findSwaps(original, [original, better], map)[0]!.cost).toBeNull();
  });
});

describe('findSwaps — ranking prefers processing', () => {
  it('puts a less-processed candidate above a same-tier macro-only candidate', () => {
    const original = product(1, 'Yogur');
    const lessProcessed = product(2, 'Yogur natural');
    const moreProtein = product(3, 'Yogur +Proteínas');
    const map = signals({
      1: { tier: 'processed', additives: 2, protein: 3, sugars: 12 },
      2: { tier: 'whole', additives: 0, protein: 3, sugars: 12 },
      3: { tier: 'processed', additives: 2, protein: 9, sugars: 12 },
    });

    const swaps = findSwaps(original, [original, moreProtein, lessProcessed], map);
    expect(swaps[0]!.product.id).toBe(2);
    expect(swaps[0]!.reasons.some((r) => r.kind === 'tier')).toBe(true);
  });

  it('still offers a same-tier pure macro improvement, with no cost', () => {
    const original = product(1, 'Yogur');
    const moreProtein = product(3, 'Yogur +Proteínas');
    const map = signals({
      1: { tier: 'processed', additives: 2, protein: 3, sugars: 12, salt: 0.2 },
      3: { tier: 'processed', additives: 2, protein: 9, sugars: 12, salt: 0.2 },
    });

    const swaps = findSwaps(original, [original, moreProtein], map);
    expect(swaps).toHaveLength(1);
    expect(swaps[0]!.cost).toBeNull();
    expect(swaps[0]!.reasons).toEqual([{ kind: 'protein', from: 3, to: 9 }]);
  });
});

describe('findSwaps — ordering', () => {
  const original = product(1, 'Original');

  /** Both candidates are strictly better than the original, differing only on one dimension. */
  const tieBreak = (
    a: SignalInput,
    b: SignalInput,
  ): number[] => {
    const map = signals({
      1: { tier: 'ultra-processed', additives: 3, nova: 4, protein: 2, sugars: 15, salt: 0.5 },
      2: a,
      3: b,
    });
    const catalog = [original, product(2, 'A'), product(3, 'B')];
    return findSwaps(original, catalog, map).map((s) => s.product.id);
  };

  it('prefers fewer additives when everything else ties', () => {
    expect(tieBreak(
      { tier: 'whole', additives: 0, nova: 1, protein: 5, sugars: 5, salt: 0.1 },
      { tier: 'whole', additives: 2, nova: 1, protein: 5, sugars: 5, salt: 0.1 },
    )).toEqual([2, 3]);
  });

  it('prefers the lower NOVA group when everything else ties', () => {
    expect(tieBreak(
      { tier: 'whole', additives: 0, nova: 1, protein: 5, sugars: 5, salt: 0.1 },
      { tier: 'whole', additives: 0, nova: 2, protein: 5, sugars: 5, salt: 0.1 },
    )).toEqual([2, 3]);
  });

  it('prefers more protein when everything else ties', () => {
    expect(tieBreak(
      { tier: 'whole', additives: 0, nova: 1, protein: 9, sugars: 5, salt: 0.1 },
      { tier: 'whole', additives: 0, nova: 1, protein: 5, sugars: 5, salt: 0.1 },
    )).toEqual([2, 3]);
  });

  it('prefers less sugar when everything else ties', () => {
    expect(tieBreak(
      { tier: 'whole', additives: 0, nova: 1, protein: 5, sugars: 3, salt: 0.1 },
      { tier: 'whole', additives: 0, nova: 1, protein: 5, sugars: 8, salt: 0.1 },
    )).toEqual([2, 3]);
  });

  it('prefers less salt when everything else ties', () => {
    expect(tieBreak(
      { tier: 'whole', additives: 0, nova: 1, protein: 5, sugars: 5, salt: 0.05 },
      { tier: 'whole', additives: 0, nova: 1, protein: 5, sugars: 5, salt: 0.3 },
    )).toEqual([2, 3]);
  });

  it('sorts a known tier above an unknown one', () => {
    expect(tieBreak(
      { tier: 'whole', additives: 0, nova: 1, protein: 5, sugars: 5, salt: 0.1 },
      { tier: 'unknown', additives: 0, nova: 1, protein: 5, sugars: 5, salt: 0.1 },
    )).toEqual([2, 3]);
  });

  it('sorts missing values last rather than treating them as best', () => {
    expect(tieBreak(
      { tier: 'whole', additives: 0, nova: 1, protein: 5, sugars: 5, salt: 0.1 },
      { tier: 'whole', additives: null, nova: null, protein: null, sugars: null, salt: null },
    )).toEqual([2, 3]);
  });

  it('breaks a full tie by product id, deterministically', () => {
    const identical: SignalInput = {
      tier: 'whole',
      additives: 0,
      nova: 1,
      protein: 5,
      sugars: 5,
      salt: 0.1,
    };
    expect(tieBreak(identical, identical)).toEqual([2, 3]);
  });
});

describe('findSwaps — invariants', () => {
  const original = product(1, 'A');
  const catalog = [original, product(2, 'B'), product(3, 'C'), product(4, 'D')];
  const map = signals({
    1: { tier: 'ultra-processed', additives: 3, nova: 4, protein: 2, sugars: 12, salt: 0.4 },
    2: { tier: 'whole', additives: 0, nova: 1, protein: 9, sugars: 2, salt: 0.1 },
    3: { tier: 'processed', additives: 1, nova: 2, protein: 5, sugars: 6, salt: 0.2 },
    4: { tier: 'unknown', additives: 2, protein: 4, sugars: 8, salt: 0.3 },
  });

  it('never returns a swap without a reason', () => {
    for (const swap of findSwaps(original, catalog, map)) {
      expect(swap.reasons.length).toBeGreaterThan(0);
    }
  });

  it('never returns a product from another leaf category', () => {
    const other = product(9, 'Otro', 99);
    const swaps = findSwaps(
      original,
      [original, other],
      signals({ 1: { tier: 'ultra-processed', additives: 3 }, 9: { tier: 'whole', additives: 0 } }),
    );
    expect(swaps).toEqual([]);
  });

  it('is deterministic for identical inputs', () => {
    expect(findSwaps(original, catalog, map)).toEqual(findSwaps(original, catalog, map));
  });

  it('respects the limit', () => {
    expect(findSwaps(original, catalog, map, 1)).toHaveLength(1);
  });

  it('returns the enriched product, so the caller can read its tier', () => {
    const swaps = findSwaps(original, catalog, map);
    expect(swaps[0]!.product.processing).toBeDefined();
  });
});
