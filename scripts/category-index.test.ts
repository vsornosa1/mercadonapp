import { describe, expect, it } from 'vitest';

import { buildCategoryIndex, topLevelCategoryIds } from './category-index.ts';

// The real categories.json shape, captured from the mirror: "results" is an
// array of SECTIONS (id 12, 18, ...), and each section carries a nested
// "categories" array whose entries are the top-level categories with files.
const realShape = {
  count: 26,
  next: null,
  previous: null,
  results: [
    {
      id: 12,
      name: 'Aceite, especias y salsas',
      categories: [
        { id: 112, name: 'Aceite, vinagre y sal', order: 7, published: true },
        { id: 115, name: 'Especias', order: 7, published: true },
      ],
    },
    {
      id: 18,
      name: 'Agua y refrescos',
      categories: [{ id: 156, name: 'Agua', order: 8, published: true }],
    },
  ],
};

// The real category-file shape: a top-level category whose nested "categories"
// are leaves carrying "products[]" (id/display_name). Captured from the mirror.
const categoryFiles = [
  {
    id: 112,
    name: 'Aceite, vinagre y sal',
    categories: [
      { id: 420, name: 'Aceite de oliva', categories: [], products: [{ id: 4241 }, { id: 4242 }] },
      { id: 422, name: 'Vinagre y otros aderezos', categories: [], products: [{ id: 5000 }] },
    ],
  },
  {
    id: 27,
    name: 'Fruta',
    categories: [{ id: 853, name: 'Plátano y uva', categories: [], products: [{ id: 3819 }] }],
  },
];

describe('topLevelCategoryIds', () => {
  it('flattens the nested category ids — section ids (12, 18) have no files', () => {
    expect(topLevelCategoryIds(realShape)).toEqual([112, 115, 156]);
  });

  it('deduplicates an id that appears under two sections', () => {
    const duplicated = {
      results: [
        { id: 1, categories: [{ id: 112 }] },
        { id: 2, categories: [{ id: 112 }, { id: 115 }] },
      ],
    };
    expect(topLevelCategoryIds(duplicated)).toEqual([112, 115]);
  });

  it('ignores a section that has no categories array', () => {
    const withBareSection = {
      results: [
        { id: 1, categories: [{ id: 112 }] },
        { id: 2 },
      ],
    };
    expect(topLevelCategoryIds(withBareSection)).toEqual([112]);
  });

  it('throws when results is missing, rather than failing deep in the download loop', () => {
    expect(() => topLevelCategoryIds({ count: 0 })).toThrow(/results/);
  });

  it('rejects a results value that is not an array', () => {
    expect(() => topLevelCategoryIds({ results: { id: 1 } })).toThrow(/results/);
  });
});

describe('buildCategoryIndex', () => {
  const index = buildCategoryIndex(categoryFiles);

  it('maps a product to its leaf and its top-level category', () => {
    expect(index.get(4241)).toEqual({
      topLevelId: 112,
      topLevelName: 'Aceite, vinagre y sal',
      leafId: 420,
      leafName: 'Aceite de oliva',
    });
  });

  it('records the leaf id that scopes swaps', () => {
    expect(index.get(3819)?.leafId).toBe(853);
    expect(index.get(3819)?.topLevelId).toBe(27);
  });

  it('does not invent entries for products absent from the tree', () => {
    expect(index.has(999999)).toBe(false);
  });

  it('walks nested categories recursively when a leaf has sub-children', () => {
    const nested = [
      {
        id: 1,
        name: 'root',
        categories: [
          {
            id: 2,
            name: 'mid',
            categories: [{ id: 3, name: 'leaf', categories: [], products: [{ id: 77 }] }],
          },
        ],
      },
    ];
    const nestedIndex = buildCategoryIndex(nested);
    expect(nestedIndex.get(77)).toEqual({ topLevelId: 1, topLevelName: 'root', leafId: 3, leafName: 'leaf' });
  });

  it('handles a leaf that has products but no categories array at all', () => {
    const bareLeaf = [{ id: 1, name: 'root', categories: [{ id: 9, name: 'leaf', products: [{ id: 99 }] }] }];
    expect(buildCategoryIndex(bareLeaf).get(99)?.leafId).toBe(9);
  });
});

