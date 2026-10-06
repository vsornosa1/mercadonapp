export interface RawProduct {
  id: number | string;
  ean?: string | null;
  photos?: unknown[] | null;
  categories?: { id?: number; level?: number; name?: string }[] | null;
  nutrition_information?: { ingredients?: string | null; allergens?: string | null } | null;
}

export interface CatalogSummary {
  total: number;
  withEan: number;
  withIngredients: number;
  withPhotos: number;
}

export function summarizeCatalog(products: readonly RawProduct[]): CatalogSummary {
  let withEan = 0;
  let withIngredients = 0;
  let withPhotos = 0;

  for (const product of products) {
    if (product.ean) withEan += 1;
    if (product.photos && product.photos.length > 0) withPhotos += 1;
    if (product.nutrition_information?.ingredients) withIngredients += 1;
  }

  return { total: products.length, withEan, withIngredients, withPhotos };
}
