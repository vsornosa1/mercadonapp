import { describe, expect, it } from 'vitest';

import { buildCategoryTree } from './category-tree.ts';
import type { CatalogProduct } from '../types/catalog.ts';

function product(id: number, section: [number, string], shelf: [number, string], leaf: [number, string]): CatalogProduct {
  return {
    id,
    ean: String(id),
    slug: 'x',
    name: `Producto ${id}`,
    brand: '',
    categoryPath: [
      { id: section[0], name: section[1] },
      { id: shelf[0], name: shelf[1] },
      { id: leaf[0], name: leaf[1] },
    ],
    leafCategoryId: leaf[0],
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
  };
}

const catalogue = [
  product(1, [12, 'Aceite, especias y salsas'], [112, 'Aceite, vinagre y sal'], [420, 'Aceite de oliva']),
  product(2, [12, 'Aceite, especias y salsas'], [112, 'Aceite, vinagre y sal'], [420, 'Aceite de oliva']),
  product(3, [12, 'Aceite, especias y salsas'], [115, 'Especias'], [500, 'Pimienta']),
  product(4, [18, 'Agua y refrescos'], [156, 'Agua'], [600, 'Agua mineral']),
];

describe('buildCategoryTree', () => {
  const tree = buildCategoryTree(catalogue);

  it('groups products into sections with counts', () => {
    expect(tree.map((s) => [s.name, s.count])).toEqual([
      ['Aceite, especias y salsas', 3],
      ['Agua y refrescos', 1],
    ]);
  });

  it('nests shelves inside their section, with counts', () => {
    const aceite = tree[0]!;
    expect(aceite.shelves.map((s) => [s.name, s.count])).toEqual([
      ['Aceite, vinagre y sal', 2],
      ['Especias', 1],
    ]);
  });

  it('sorts sections and shelves alphabetically for scannability', () => {
    const names = tree.map((s) => s.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es')));
    const shelfNames = tree[0]!.shelves.map((s) => s.name);
    expect(shelfNames).toEqual([...shelfNames].sort((a, b) => a.localeCompare(b, 'es')));
  });

  it('keeps the ids needed to drill down', () => {
    expect(tree[0]!.id).toBe(12);
    expect(tree[0]!.shelves[0]!.id).toBe(112);
  });

  it('returns an empty tree for an empty catalogue', () => {
    expect(buildCategoryTree([])).toEqual([]);
  });

  it('ignores products without a usable path instead of crashing', () => {
    const broken = { ...product(9, [1, 'S'], [1, 'Sh'], [1, 'L']), categoryPath: [] };
    expect(buildCategoryTree([broken])).toEqual([]);
  });
});
