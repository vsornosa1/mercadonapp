import type { CatalogProduct, CategoryNode } from '../src/types/catalog.ts';
import type { CategoryPath } from './category-index.ts';
import type { RawProduct } from './summarize.ts';

/**
 * Maps a raw mirror product plus its tree-derived lineage to the app's
 * CatalogProduct. Field names and shapes differ from the raw API (prices are
 * strings, unit_size is a number, categories is a single section entry) — those
 * normalisations happen here, once, and are pinned by to-product.test.ts.
 */
export function toCatalogProduct(raw: RawProduct, lineage: CategoryPath): CatalogProduct {
  const section = raw.categories?.[0];
  const categoryPath: CategoryNode[] = [];
  if (section && section.id != null && section.name) {
    categoryPath.push({ id: section.id, name: section.name });
  }
  categoryPath.push({ id: lineage.topLevelId, name: lineage.topLevelName });
  categoryPath.push({ id: lineage.leafId, name: lineage.leafName });

  const pi = raw.price_instructions;
  const unitPriceRaw = pi?.unit_price ?? pi?.bulk_price ?? null;
  const unitPrice = unitPriceRaw != null && unitPriceRaw !== '' ? Number.parseFloat(unitPriceRaw) : 0;
  const bulkPrice =
    pi?.bulk_price != null && pi.bulk_price !== '' ? Number.parseFloat(pi.bulk_price) : null;
  const unitSize =
    pi?.unit_size != null && pi.size_format ? `${pi.unit_size} ${pi.size_format}` : (pi?.reference_format ?? '');

  return {
    id: Number(raw.id),
    ean: raw.ean ?? null,
    slug: raw.slug ?? '',
    name: raw.display_name ?? '',
    brand: raw.brand ?? '',
    categoryPath,
    leafCategoryId: lineage.leafId,
    thumbnail: raw.thumbnail ?? raw.photos?.[0]?.thumbnail ?? '',
    photo: raw.photos?.[0]?.regular ?? raw.thumbnail ?? '',
    unitPrice,
    bulkPrice,
    unitSize,
    packaging: raw.packaging ?? null,
    ingredientsHtml: raw.nutrition_information?.ingredients ?? null,
    allergensHtml: raw.nutrition_information?.allergens ?? null,
    isVariableWeight: raw.is_variable_weight === true,
    shareUrl: raw.share_url ?? '',
  };
}
