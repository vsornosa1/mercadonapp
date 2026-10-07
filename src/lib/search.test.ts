import { describe, expect, it } from 'vitest';

import { search } from './search';
import type { CatalogProduct } from '../types/catalog';

const base: CatalogProduct = {
  id: 1,
  ean: '1',
  slug: 'x',
  name: 'x',
  brand: '',
  categoryPath: [],
  leafCategoryId: 0,
  thumbnail: '',
  photo: '',
  unitPrice: 0,
  bulkPrice: null,
  unitSize: '',
  packaging: null,
  ingredientsHtml: null,
  allergensHtml: null,
  isVariableWeight: false,
  shareUrl: '',
};

const products: CatalogProduct[] = [
  { ...base, id: 1, name: 'Plátano de Canarias IGP', leafCategoryId: 853 },
  { ...base, id: 2, name: 'Atún claro en aceite de oliva', brand: 'Hacendado', leafCategoryId: 122 },
  { ...base, id: 3, name: 'Leche entera', brand: 'Hacendado', leafCategoryId: 72 },
  { ...base, id: 4, name: 'Preparado lácteo con leche', brand: 'Milka', leafCategoryId: 598 },
  { ...base, id: 5, name: 'Pan de molde integral', brand: 'Hacendado', leafCategoryId: 60 },
];

describe('search', () => {
  it('returns every match instead of a truncated sample', () => {
    // The screen paginates, so a cap here only hides results and makes the
    // "N resultados" heading a lie.
    const many: CatalogProduct[] = Array.from({ length: 137 }, (_, i) => ({
      ...base,
      id: i + 1,
      name: `Leche número ${i + 1}`,
    }));
    expect(search('leche', many)).toHaveLength(137);
  });

  it('finds Plátano from a query typed without the accent', () => {
    expect(search('platano', products).map((p) => p.id)).toContain(1);
  });

  it('ranks an exact prefix match above a mere substring', () => {
    expect(search('leche', products).map((p) => p.id)[0]).toBe(3);
  });

  it('matches a brand', () => {
    expect(search('hacendado', products).map((p) => p.id)).toEqual(
      expect.arrayContaining([2, 3, 5]),
    );
  });

  it('finds Atún from "atun"', () => {
    expect(search('atun', products).map((p) => p.id)).toContain(2);
  });

  it('returns nothing for an empty or whitespace query', () => {
    expect(search('', products)).toEqual([]);
    expect(search('   ', products)).toEqual([]);
  });

  it('returns nothing when nothing matches', () => {
    expect(search('zzzzzz', products)).toEqual([]);
  });

  const withCategory: CatalogProduct = {
    ...base,
    id: 6,
    name: 'Producto',
    categoryPath: [
      { id: 27, name: 'Fruta' },
      { id: 853, name: 'Plátano y uva' },
    ],
  };

  it('matches a category by exact name', () => {
    expect(search('fruta', [...products, withCategory]).map((p) => p.id)).toContain(6);
  });

  it('matches a category by prefix', () => {
    expect(search('platano y', [...products, withCategory]).map((p) => p.id)).toContain(6);
  });

  it('matches a category by substring', () => {
    expect(search('y uva', [...products, withCategory]).map((p) => p.id)).toContain(6);
  });

  it('breaks score ties by name for deterministic ordering', () => {
    const tied = [
      { ...base, id: 10, name: 'Zumo', brand: 'Hacendado' },
      { ...base, id: 11, name: 'Agua', brand: 'Hacendado' },
    ];
    expect(search('hacendado', tied).map((p) => p.id)).toEqual([11, 10]);
  });
});

describe('search — multiple words', () => {
  const catalogue: CatalogProduct[] = [
    { ...base, id: 1, name: 'Natillas sabor vainilla +Proteínas 12 g', brand: '+Proteínas' },
    { ...base, id: 2, name: 'Yogur natural', brand: 'Hacendado' },
    { ...base, id: 3, name: 'Leche entera', brand: 'Hacendado' },
  ];

  it('matches a product containing every word, even when they are not adjacent', () => {
    expect(search('natillas proteina', catalogue).map((p) => p.id)).toEqual([1]);
  });

  it('requires all words to match — a partial match is not a result', () => {
    expect(search('natillas hacendado', catalogue)).toEqual([]);
  });

  it('lets words match across different fields', () => {
    // "yogur" is in the name, "hacendado" is the brand
    expect(search('yogur hacendado', catalogue).map((p) => p.id)).toEqual([2]);
  });

  it('ignores extra whitespace between words', () => {
    expect(search('  natillas    proteina  ', catalogue).map((p) => p.id)).toEqual([1]);
  });

  it('still ranks a single word as before', () => {
    expect(search('leche', catalogue).map((p) => p.id)).toEqual([3]);
  });
});
