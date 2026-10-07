import { describe, expect, it } from 'vitest';

import {
  evaluateAlternatives,
  explainAlternatives,
  hasComparableData,
  isFoodProduct,
} from './alternatives.ts';
import type { SwapSignals } from './swaps.ts';
import type { EnrichedCatalogProduct } from '../types/catalog.ts';

const richSignals: SwapSignals = {
  tier: 'ultra-processed',
  additiveCount: 2,
  additiveCodes: ['407', '460'],
  novaGroup: 4,
  protein: 5,
  sugars: 12,
  salt: 0.2,
};

const emptySignals: SwapSignals = {
  tier: 'unknown',
  additiveCount: null,
  additiveCodes: [],
  novaGroup: null,
  protein: null,
  sugars: null,
  salt: null,
};

/** Category path — ids are irrelevant to the food/non-food decision. */
const path = (...names: string[]) => names.map((name, index) => ({ id: index, name }));

/** Category path with ids — needed by evaluateAlternatives. */
const pathOf = (...entries: [number, string][]) =>
  entries.map(([id, name]) => ({ id, name }));

function product(
  id: number,
  name: string,
  categoryPath: { id: number; name: string }[],
  leafCategoryId: number,
): EnrichedCatalogProduct {
  return {
    id,
    ean: String(id),
    slug: 'x',
    name,
    brand: '',
    categoryPath,
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

const FOOD: [number, string] = [12, 'Aceite, especias y salsas'];
const SHELF: [number, string] = [112, 'Aceite, vinagre y sal'];
const LEAF: [number, string] = [420, 'Aceite de oliva'];
const LEAF_ID = 420;

describe('isFoodProduct', () => {
  it('treats a normal food section as food', () => {
    expect(isFoodProduct(path('Fruta y verdura', 'Fruta', 'Plátano y uva'))).toBe(true);
    expect(isFoodProduct(path('Charcutería y quesos', 'Queso untable', 'Untables'))).toBe(true);
  });

  it('treats cleaning, cosmetics and pet sections as non-food, where nutrition advice is meaningless', () => {
    expect(isFoodProduct(path('Limpieza y hogar', 'Lejía y líquidos fuertes', 'Lejía'))).toBe(false);
    expect(isFoodProduct(path('Maquillaje', 'Labios', 'Labiales'))).toBe(false);
    expect(isFoodProduct(path('Mascotas', 'Perro', 'Comida para perro'))).toBe(false);
    expect(isFoodProduct(path('Cuidado del cabello', 'Champú', 'Champú normal'))).toBe(false);
  });

  it('keeps baby FOOD as food even though the Bebé section is mostly non-food', () => {
    expect(isFoodProduct(path('Bebé', 'Alimentación infantil', 'Papillas'))).toBe(true);
    expect(isFoodProduct(path('Bebé', 'Leche y bebidas vegetales', 'Preparados'))).toBe(true);
  });

  it('treats the rest of the Bebé section as non-food', () => {
    expect(isFoodProduct(path('Bebé', 'Toallitas y pañales', 'Pañales'))).toBe(false);
    expect(isFoodProduct(path('Bebé', 'Biberón y chupete', 'Biberones'))).toBe(false);
  });

  it('errs on the side of food for an unknown section, so the panel is not silently hidden', () => {
    expect(isFoodProduct(path('Sección desconocida', 'Cosa', 'Otra'))).toBe(true);
  });

  it('treats an empty path as food rather than suppressing the panel', () => {
    expect(isFoodProduct([])).toBe(true);
  });
});

describe('hasComparableData', () => {
  it('is true when any dimension can be compared', () => {
    expect(hasComparableData(richSignals)).toBe(true);
  });

  it('is true with ingredients alone — additives are comparable', () => {
    expect(hasComparableData({ ...emptySignals, additiveCount: 0 })).toBe(true);
  });

  it('is true with macros alone', () => {
    expect(hasComparableData({ ...emptySignals, protein: 9 })).toBe(true);
  });

  it('is true with only a NOVA group', () => {
    expect(hasComparableData({ ...emptySignals, novaGroup: 2 })).toBe(true);
  });

  it('is false when nothing can be compared', () => {
    expect(hasComparableData(emptySignals)).toBe(false);
  });
});

describe('explainAlternatives', () => {
  it('reports non-food so the UI can omit the panel entirely', () => {
    expect(explainAlternatives(path('Limpieza y hogar', 'Lejía', 'Lejía'), richSignals, 12)).toEqual({
      kind: 'non-food',
    });
  });

  it('reports no-data when the product cannot be compared at all', () => {
    expect(
      explainAlternatives(path('Fruta y verdura', 'Fruta', 'Plátano'), emptySignals, 30),
    ).toEqual({ kind: 'no-data' });
  });

  it('reports none-better with the number of peers actually compared', () => {
    expect(explainAlternatives(path('Bodega', 'Vino tinto', 'Rioja'), richSignals, 27)).toEqual({
      kind: 'none-better',
      comparedCount: 27,
    });
  });

  it('prefers non-food over the other cases — a shampoo is not a nutrition question', () => {
    expect(explainAlternatives(path('Maquillaje', 'Labios', 'Labiales'), emptySignals, 0)).toEqual({
      kind: 'non-food',
    });
  });
});

describe('evaluateAlternatives', () => {
  it('returns available swaps for a food product with a better peer', () => {
    const target = product(1, 'Aceite malo', pathOf(FOOD, SHELF, LEAF), LEAF_ID);
    const better = product(2, 'Aceite bueno', pathOf(FOOD, SHELF, LEAF), LEAF_ID);
    const signals = new Map<number, SwapSignals>([
      [1, { tier: 'ultra-processed', additiveCount: 3, additiveCodes: ['407'], novaGroup: 4, protein: 1, sugars: 5, salt: 1 }],
      [2, { tier: 'whole', additiveCount: 0, additiveCodes: [], novaGroup: 1, protein: 9, sugars: 1, salt: 0.1 }],
    ]);

    const result = evaluateAlternatives(target, [target, better], signals);
    expect(result.kind).toBe('available');
    if (result.kind === 'available') expect(result.swaps[0]!.product.id).toBe(2);
  });

  it('reports non-food without looking for swaps at all', () => {
    const shampoo = product(
      3,
      'Champú',
      pathOf([2, 'Cuidado del cabello'], [31, 'Champú'], [900, 'Normal']),
      900,
    );
    const signals = new Map<number, SwapSignals>([
      [3, { tier: 'ultra-processed', additiveCount: 2, additiveCodes: [], novaGroup: 4, protein: null, sugars: null, salt: null }],
    ]);
    expect(evaluateAlternatives(shampoo, [shampoo], signals)).toEqual({ kind: 'non-food' });
  });

  it('reports no-data when the product has no comparable signals', () => {
    const plain = product(4, 'Manzana', pathOf(FOOD, SHELF, LEAF), LEAF_ID);
    const signals = new Map<number, SwapSignals>([[4, emptySignals]]);
    expect(evaluateAlternatives(plain, [plain], signals)).toEqual({ kind: 'no-data' });
  });

  it('reports none-better with the real peer count when no peer wins', () => {
    const best = product(5, 'Leche entera', pathOf(FOOD, SHELF, LEAF), LEAF_ID);
    const peerA = product(6, 'Leche A', pathOf(FOOD, SHELF, LEAF), LEAF_ID);
    const peerB = product(7, 'Leche B', pathOf(FOOD, SHELF, LEAF), LEAF_ID);
    const identical: SwapSignals = {
      tier: 'whole',
      additiveCount: 0,
      additiveCodes: [],
      novaGroup: 1,
      protein: 3,
      sugars: 4,
      salt: 0.1,
    };
    const signals = new Map<number, SwapSignals>([
      [5, identical],
      [6, identical],
      [7, identical],
    ]);
    expect(evaluateAlternatives(best, [best, peerA, peerB], signals)).toEqual({
      kind: 'none-better',
      comparedCount: 2,
    });
  });

  it('does not count products from other shelves as compared peers', () => {
    const target = product(8, 'Objetivo', pathOf(FOOD, SHELF, LEAF), LEAF_ID);
    const otherShelf = product(9, 'Otro', pathOf(FOOD, [115, 'Especias'], [500, 'Pimienta']), 500);
    const identical: SwapSignals = {
      tier: 'whole',
      additiveCount: 0,
      additiveCodes: [],
      novaGroup: 1,
      protein: 3,
      sugars: 4,
      salt: 0.1,
    };
    const signals = new Map<number, SwapSignals>([
      [8, identical],
      [9, identical],
    ]);
    expect(evaluateAlternatives(target, [target, otherShelf], signals)).toEqual({
      kind: 'none-better',
      comparedCount: 0,
    });
  });
});
