import { describe, expect, it } from 'vitest';

import { loadCatalog } from '../test-catalog.ts';
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

/**
 * The mismatches these guard against were real: the tree counted by
 * `(section, shelf)` while the listing filtered by `shelf` alone, so opening
 * *Fruta* showed a count of 2 and then 50 products. The worst gap was 107.
 *
 * Asserted against the committed bundle, because a fixture would not contain the
 * cross-listing that caused it.
 */
describe('counts against the real catalogue', () => {
  const catalog = loadCatalog();
  const tree = buildCategoryTree(catalog);

  it('counts every product exactly once across the sections', () => {
    const total = tree.reduce((sum, section) => sum + section.count, 0);
    expect(total).toBe(catalog.length);
  });

  it('never disagrees with the list a section opens', () => {
    const mismatches = tree
      .map((section) => ({
        name: section.name,
        counted: section.count,
        opened: catalog.filter((p) => p.categoryPath[0]?.id === section.id).length,
      }))
      .filter((entry) => entry.counted !== entry.opened);

    expect(mismatches).toEqual([]);
  });

  it('never disagrees with the list a shelf opens', () => {
    const mismatches = tree.flatMap((section) =>
      section.shelves
        .map((shelf) => ({
          name: `${section.name} › ${shelf.name}`,
          counted: shelf.count,
          opened: catalog.filter(
            (p) => p.categoryPath[0]?.id === section.id && p.categoryPath[1]?.id === shelf.id,
          ).length,
        }))
        .filter((entry) => entry.counted !== entry.opened),
    );

    expect(mismatches).toEqual([]);
  });

  it('is not vacuous: the catalogue really does cross-list shelves under sections', () => {
    // This is *why* the pair is the key. If the mirror ever stopped cross-listing,
    // the tests above would still pass but would no longer be testing anything.
    const sectionsPerShelf = new Map<number, Set<number>>();
    for (const item of catalog) {
      const section = item.categoryPath[0]?.id;
      const shelf = item.categoryPath[1]?.id;
      if (section === undefined || shelf === undefined) continue;
      const seen = sectionsPerShelf.get(shelf) ?? new Set<number>();
      seen.add(section);
      sectionsPerShelf.set(shelf, seen);
    }

    const crossListed = [...sectionsPerShelf.values()].filter((seen) => seen.size > 1);
    expect(crossListed.length).toBeGreaterThan(0);
  });
});
