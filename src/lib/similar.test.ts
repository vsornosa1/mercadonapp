import { describe, expect, it } from 'vitest';

import type { CategoryNode, EnrichedCatalogProduct } from '../types/catalog.ts';
import { findSimilar } from './similar.ts';

const SECTION_A = { id: 1, name: 'Bodega' };
const SHELF_A1 = { id: 10, name: 'Vino tinto' };
const LEAF_A1x = { id: 100, name: 'Rioja' };
const LEAF_A1y = { id: 101, name: 'Ribera' };
const SECTION_B = { id: 2, name: 'Limpieza y hogar' };
const SHELF_B1 = { id: 20, name: 'Detergente' };
const LEAF_B1x = { id: 200, name: 'Detergente líquido' };

function product(
  id: number,
  name: string,
  path: readonly [CategoryNode, CategoryNode, CategoryNode],
  unitPrice = 5,
  brand = 'Hacendado',
): EnrichedCatalogProduct {
  return {
    id,
    ean: String(id),
    slug: `p${id}`,
    name,
    brand,
    categoryPath: [...path],
    leafCategoryId: path[2].id,
    thumbnail: '',
    photo: '',
    unitPrice,
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

const target = product(1, 'Vino objetivo', [SECTION_A, SHELF_A1, LEAF_A1x], 5);
const sameLeaf = product(2, 'Vino mismo estante', [SECTION_A, SHELF_A1, LEAF_A1x], 6, 'Otra');
const sameShelf = product(3, 'Vino otra denominación', [SECTION_A, SHELF_A1, LEAF_A1y], 5);
const otherSection = product(4, 'Detergente líquido', [SECTION_B, SHELF_B1, LEAF_B1x], 5, 'Bosque Verde');
const otherDetergent = product(5, 'Detergente en polvo', [SECTION_B, SHELF_B1, LEAF_B1x], 7, 'Bosque Verde');

const catalog = [target, sameLeaf, sameShelf, otherSection, otherDetergent];

describe('findSimilar', () => {
  it('offers the same category before the same aisle', () => {
    expect(findSimilar(target, catalog).map((p) => p.id)).toEqual([2, 3]);
  });

  it('never offers the product itself', () => {
    expect(findSimilar(target, catalog).map((p) => p.id)).not.toContain(1);
  });

  it('skips products already recommended as better alternatives', () => {
    const ids = findSimilar(target, catalog, new Set([2])).map((p) => p.id);
    expect(ids).not.toContain(2);
    expect(ids).toContain(3);
  });

  it('leaves out another part of the shop', () => {
    expect(findSimilar(target, catalog).map((p) => p.id)).not.toContain(4);
  });

  it('works the same for non-food, where health advice does not apply', () => {
    expect(findSimilar(otherSection, catalog).map((p) => p.id)).toEqual([5]);
  });

  it('has nothing to offer for a product alone in its aisle', () => {
    const lonely = product(9, 'Único', [{ id: 3, name: 'Mascotas' }, { id: 30, name: 'Juguetes' }, { id: 300, name: 'Cuerda' }]);
    expect(findSimilar(lonely, [...catalog, lonely])).toEqual([]);
  });

  it('keeps the closest price first inside the same category', () => {
    const cheap = product(11, 'Vino barato', [SECTION_A, SHELF_A1, LEAF_A1x], 5.2);
    const pricey = product(12, 'Vino caro', [SECTION_A, SHELF_A1, LEAF_A1x], 40);
    const ids = findSimilar(target, [...catalog, cheap, pricey]).map((p) => p.id);
    expect(ids.indexOf(11)).toBeLessThan(ids.indexOf(12));
  });

  it('respects the limit', () => {
    expect(findSimilar(target, catalog, new Set(), 1).map((p) => p.id)).toEqual([2]);
  });

  it('orders the same way every time', () => {
    const once = findSimilar(target, catalog).map((p) => p.id);
    const twice = findSimilar(target, [...catalog].reverse()).map((p) => p.id);
    expect(twice).toEqual(once);
  });
});
