import { describe, expect, it } from 'vitest';

import type { CategoryPath } from './category-index.ts';
import type { RawProduct } from './summarize.ts';
import { toCatalogProduct } from './to-product.ts';

const lineage: CategoryPath = {
  topLevelId: 112,
  topLevelName: 'Aceite, vinagre y sal',
  leafId: 420,
  leafName: 'Aceite de oliva',
};

describe('toCatalogProduct', () => {
  it('maps a packaged product with section, top-level and leaf to a 3-level path', () => {
    const raw: RawProduct = {
      id: '4241',
      ean: '8402001027482',
      brand: 'Hacendado',
      display_name: 'Aceite de oliva 0,4º Hacendado',
      slug: 'aceite-oliva-04o-hacendado-garrafa',
      share_url: 'https://tienda.mercadona.es/product/4241/aceite-oliva',
      packaging: 'Garrafa',
      thumbnail: 'https://img/thumb.jpg',
      photos: [{ regular: 'https://img/regular.jpg', thumbnail: 'https://img/thumb.jpg' }],
      price_instructions: {
        unit_price: '17.25',
        bulk_price: '3.45',
        unit_size: 5,
        size_format: 'l',
        reference_format: 'L',
      },
      categories: [{ id: 12, level: 0, name: 'Aceite, especias y salsas' }],
      nutrition_information: {
        ingredients: '<p>Ingredientes: Aceite de oliva refinado.</p>',
        allergens: '<strong>x99</strong>.',
      },
      is_variable_weight: false,
    };

    expect(toCatalogProduct(raw, lineage)).toEqual({
      id: 4241,
      ean: '8402001027482',
      slug: 'aceite-oliva-04o-hacendado-garrafa',
      name: 'Aceite de oliva 0,4º Hacendado',
      brand: 'Hacendado',
      categoryPath: [
        { id: 12, name: 'Aceite, especias y salsas' },
        { id: 112, name: 'Aceite, vinagre y sal' },
        { id: 420, name: 'Aceite de oliva' },
      ],
      leafCategoryId: 420,
      thumbnail: 'https://img/thumb.jpg',
      photo: 'https://img/regular.jpg',
      unitPrice: 17.25,
      bulkPrice: 3.45,
      unitSize: '5 l',
      packaging: 'Garrafa',
      ingredientsHtml: '<p>Ingredientes: Aceite de oliva refinado.</p>',
      allergensHtml: '<strong>x99</strong>.',
      isVariableWeight: false,
      shareUrl: 'https://tienda.mercadona.es/product/4241/aceite-oliva',
    });
  });

  it('builds a 2-level path when the product carries no section entry', () => {
    const raw: RawProduct = { id: '3819', ean: '2105410038198', display_name: 'Plátano de Canarias IGP', categories: [] };
    const result = toCatalogProduct(raw, { topLevelId: 27, topLevelName: 'Fruta', leafId: 853, leafName: 'Plátano y uva' });
    expect(result.categoryPath).toEqual([
      { id: 27, name: 'Fruta' },
      { id: 853, name: 'Plátano y uva' },
    ]);
    expect(result.leafCategoryId).toBe(853);
  });

  it('turns null ingredients into null, never an empty string', () => {
    const raw: RawProduct = { id: '1', ean: '123', nutrition_information: { ingredients: null } };
    expect(toCatalogProduct(raw, lineage).ingredientsHtml).toBeNull();
  });

  it('falls back to bulk_price when unit_price is absent', () => {
    const raw: RawProduct = { id: '2', ean: '456', price_instructions: { bulk_price: '3.45' } };
    const result = toCatalogProduct(raw, lineage);
    expect(result.unitPrice).toBe(3.45);
    expect(result.bulkPrice).toBe(3.45);
  });

  it('is zero price when no price data exists', () => {
    const raw: RawProduct = { id: '3', ean: '789' };
    const result = toCatalogProduct(raw, lineage);
    expect(result.unitPrice).toBe(0);
    expect(result.bulkPrice).toBeNull();
  });

  it('uses the photo field when a top-level thumbnail is missing', () => {
    const raw: RawProduct = { id: '4', ean: '111', photos: [{ regular: 'https://img/r.jpg', thumbnail: 'https://img/t.jpg' }] };
    expect(toCatalogProduct(raw, lineage).thumbnail).toBe('https://img/t.jpg');
  });
});
