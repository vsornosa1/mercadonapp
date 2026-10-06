export interface RawProduct {
  id: number | string;
  ean?: string | null;
  brand?: string | null;
  display_name?: string;
  slug?: string;
  share_url?: string;
  packaging?: string | null;
  thumbnail?: string;
  is_bulk?: boolean;
  is_variable_weight?: boolean;
  photos?: { regular?: string; thumbnail?: string }[] | null;
  price_instructions?: {
    unit_price?: string | null;
    bulk_price?: string | null;
    unit_size?: number | null;
    size_format?: string | null;
    reference_format?: string | null;
  } | null;
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
