import type { CategoryNode, EnrichedCatalogProduct } from './types/catalog.ts';

/**
 * Shared product builder for tests.
 *
 * Several suites were each hand-rolling the same 18-field literal, which made a
 * change to the catalogue type a multi-file chore. Only test code imports this;
 * it never reaches the bundle.
 */

const DEFAULT_PATH: [CategoryNode, CategoryNode, CategoryNode] = [
  { id: 12, name: 'Aceite, especias y salsas' },
  { id: 112, name: 'Aceite, vinagre y sal' },
  { id: 420, name: 'Aceite de oliva' },
];

export function makeProduct(
  overrides: Partial<EnrichedCatalogProduct> & { id: number },
): EnrichedCatalogProduct {
  return {
    ean: String(overrides.id),
    slug: 'x',
    name: 'Producto',
    brand: '',
    categoryPath: DEFAULT_PATH,
    leafCategoryId: DEFAULT_PATH[2].id,
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
