import { describe, expect, it } from 'vitest';

import type { EnrichedCatalogProduct } from '../types/catalog.ts';
import { swapSignalsFor, type SwapSignals } from './swaps.ts';

function enriched(overrides: Partial<EnrichedCatalogProduct>): EnrichedCatalogProduct {
  return {
    id: 1,
    ean: '1',
    slug: 'x',
    name: 'x',
    brand: '',
    categoryPath: [],
    leafCategoryId: 0,
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
    ...overrides,
  };
}

describe('swapSignalsFor', () => {
  it('derives the additive count and codes from the ingredient text', () => {
    const p = enriched({ ingredientsHtml: 'estabilizantes (E-407, E-460)' });
    expect(swapSignalsFor(p)).toEqual(
      expect.objectContaining({ additiveCount: 2, additiveCodes: ['407', '460'] }),
    );
  });

  it('is null additive count when no ingredient list is published — silence is not zero', () => {
    const p = enriched({ ingredientsHtml: null });
    expect(swapSignalsFor(p).additiveCount).toBeNull();
    expect(swapSignalsFor(p).additiveCodes).toEqual([]);
  });

  it('carries nova and macros through from nutrition', () => {
    const p = enriched({
      nutrition: {
        source: 'off',
        offCode: '1',
        per100: { kcal: 100, protein: 9, carbs: 5, fat: 2, saturatedFat: 1, sugars: 4, salt: 0.1, fiber: 0 },
        novaGroup: 4,
        additives: [],
      },
    });
    const signals: SwapSignals = swapSignalsFor(p);
    expect(signals.novaGroup).toBe(4);
    expect(signals.protein).toBe(9);
    expect(signals.sugars).toBe(4);
    expect(signals.salt).toBe(0.1);
  });

  it('is null macros when nutrition has no data', () => {
    const p = enriched({});
    const signals = swapSignalsFor(p);
    expect(signals.protein).toBeNull();
    expect(signals.novaGroup).toBeNull();
  });

  it('carries the composed tier the UI displays, so the ranking can see its own badge', () => {
    const p = enriched({
      processing: { basis: 'off-nova', tier: 'ultra-processed', additiveMarkers: [] },
    });
    expect(swapSignalsFor(p).tier).toBe('ultra-processed');
  });
});
