import { describe, expect, it } from 'vitest';

import { summarizeCatalog, type RawProduct } from './summarize.ts';

// Task 5 prints real counts over the downloaded mirror, so the counting logic
// is pinned here against hand-built fixtures before the download ever runs.
describe('summarizeCatalog', () => {
  const packaged: RawProduct = {
    id: 4241,
    ean: '8402001027482',
    photos: [{ regular: 'x', thumbnail: 'x' }],
    categories: [
      { id: 1, level: 0, name: 'root' },
      { id: 112, level: 1, name: 'Aceite' },
      { id: 412, level: 2, name: 'Aceite de oliva' },
    ],
    nutrition_information: { ingredients: 'Aceite de oliva refinado.', allergens: null },
  };

  it('counts a fully-populated packaged product on every axis', () => {
    expect(summarizeCatalog([packaged])).toEqual({
      total: 1,
      withEan: 1,
      withIngredients: 1,
      withPhotos: 1,
    });
  });

  it('counts nothing for a barcode-less fresh product with a single-level category', () => {
    const fresh: RawProduct = {
      id: 3819,
      ean: null,
      categories: [{ id: 27, level: 0, name: 'Fruta y verdura' }],
      nutrition_information: { ingredients: null },
    };
    expect(summarizeCatalog([fresh])).toEqual({
      total: 1,
      withEan: 0,
      withIngredients: 0,
      withPhotos: 0,
    });
  });

  it('tolerates a null nutrition_information object', () => {
    const bare: RawProduct = { id: 1, ean: '123', nutrition_information: null };
    expect(summarizeCatalog([bare]).withIngredients).toBe(0);
  });

  it('does not count an empty-string ingredients value as present', () => {
    const empty: RawProduct = {
      id: 2,
      ean: '456',
      nutrition_information: { ingredients: '' },
    };
    expect(summarizeCatalog([empty]).withIngredients).toBe(0);
  });

  it('aggregates across a mixed batch', () => {
    const result = summarizeCatalog([
      packaged,
      { id: 9, ean: null, nutrition_information: { ingredients: null } },
      { id: 10, ean: '111', photos: [], nutrition_information: { ingredients: 'sal' } },
    ]);
    expect(result.total).toBe(3);
    expect(result.withEan).toBe(2);
    expect(result.withIngredients).toBe(2);
    expect(result.withPhotos).toBe(1);
  });
});
