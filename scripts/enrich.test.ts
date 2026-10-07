import { describe, expect, it } from 'vitest';

import type { CategoryPath } from './category-index.ts';
import { composeProcessing, enrichProduct, mapOffToNutrition, novaTier } from './enrich.ts';
import type { RawProduct } from './summarize.ts';

const foundOff = {
  status: 1,
  product: {
    nutriments: {
      'energy-kcal_100g': 265,
      proteins_100g: 10,
      carbohydrates_100g: 35,
      fat_100g: 7.8,
      'saturated-fat_100g': 1,
      sugars_100g: 2.1,
      salt_100g: 1.3,
    },
    nova_group: 4,
    additives_tags: ['en:e407', 'en:e330'],
  },
};

describe('mapOffToNutrition', () => {
  it('maps a found OFF product field-for-field', () => {
    expect(mapOffToNutrition(foundOff, '8480000823021')).toEqual({
      source: 'off',
      offCode: '8480000823021',
      per100: {
        kcal: 265,
        protein: 10,
        carbs: 35,
        fat: 7.8,
        saturatedFat: 1,
        sugars: 2.1,
        salt: 1.3,
        fiber: null,
      },
      novaGroup: 4,
      additives: [
        { code: 'E407', label: null },
        { code: 'E330', label: null },
      ],
    });
  });

  it('returns none for a not-found barcode', () => {
    expect(mapOffToNutrition({ status: 0 }, '1')).toEqual({
      source: 'none',
      per100: null,
      novaGroup: null,
      additives: [],
    });
  });

  it('preserves partial data — kcal without fiber keeps the kcal', () => {
    const partial = { status: 1, product: { nutriments: { 'energy-kcal_100g': 44 } } };
    const result = mapOffToNutrition(partial, '2');
    expect(result.per100?.kcal).toBe(44);
    expect(result.per100?.fiber).toBeNull();
    expect(result.novaGroup).toBeNull();
  });

  it('accepts nova_group as a string', () => {
    expect(mapOffToNutrition({ status: 1, product: { nova_group: '3' } }, '3').novaGroup).toBe(3);
  });
});

describe('novaTier', () => {
  it('maps NOVA 1 to whole, 2–3 to processed, 4 to ultra-processed', () => {
    expect(novaTier(1)).toBe('whole');
    expect(novaTier(2)).toBe('processed');
    expect(novaTier(3)).toBe('processed');
    expect(novaTier(4)).toBe('ultra-processed');
  });
});

describe('composeProcessing', () => {
  it('prefers off-nova when present', () => {
    expect(composeProcessing(foundOff, 'ingredientes', ['Fruta'])).toEqual({
      basis: 'off-nova',
      tier: 'ultra-processed',
      additiveMarkers: [],
    });
  });

  it('falls back to the ingredient heuristic when OFF has no nova group', () => {
    expect(composeProcessing({ status: 1, product: {} }, 'estabilizante E-407', [])).toEqual({
      basis: 'ingredient-heuristic',
      tier: 'processed',
      additiveMarkers: ['estabilizante'],
    });
  });

  it('falls back to the category rule for fresh foods with no ingredients', () => {
    expect(composeProcessing({ status: 0 }, null, ['Fruta', 'Plátano y uva'])).toEqual({
      basis: 'category-rule',
      tier: 'whole',
      additiveMarkers: [],
    });
  });

  it('is unknown when there is no data anywhere', () => {
    expect(composeProcessing({ status: 0 }, null, ['Limpieza'])).toEqual({
      basis: 'ingredient-heuristic',
      tier: 'unknown',
      additiveMarkers: [],
    });
  });
});

describe('enrichProduct', () => {
  const lineage: CategoryPath = {
    topLevelId: 60,
    topLevelName: 'Pan de molde y otras especialidades',
    leafId: 99,
    leafName: 'Pan de molde',
  };

  it('enriches a packaged product with OFF data', () => {
    const raw: RawProduct = {
      id: '42',
      ean: '8480000823021',
      nutrition_information: { ingredients: '<p>Harina, agua...</p>' },
    };
    const result = enrichProduct(raw, lineage, foundOff);
    expect(result.id).toBe(42);
    expect(result.nutrition.source).toBe('off');
    expect(result.processing.basis).toBe('off-nova');
  });

  it('gives a fresh product none nutrition and a category-rule tier', () => {
    const raw: RawProduct = { id: '3819', ean: '2105410038198', nutrition_information: { ingredients: null } };
    const freshLineage: CategoryPath = { topLevelId: 27, topLevelName: 'Fruta', leafId: 853, leafName: 'Plátano y uva' };
    const result = enrichProduct(raw, freshLineage, { status: 0 });
    expect(result.nutrition.source).toBe('none');
    expect(result.processing).toEqual({ basis: 'category-rule', tier: 'whole', additiveMarkers: [] });
  });
});
