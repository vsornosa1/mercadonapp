export interface CategoryNode {
  id: number;
  name: string;
}

export interface CatalogProduct {
  id: number; // Mercadona product id
  ean: string | null; // the join key for nutrition; null must be tolerated (fresh produce has no barcode)
  slug: string;
  name: string; // display_name, verbatim Spanish
  brand: string;
  categoryPath: CategoryNode[]; // 3 levels, root → leaf
  leafCategoryId: number; // deepest level; scopes swaps
  thumbnail: string; // imgix thumbnail, for lists
  photo: string; // imgix regular, for the product view
  unitPrice: number;
  bulkPrice: number | null;
  unitSize: string; // e.g. "1 l"
  packaging: string | null;
  ingredientsHtml: string | null;
  allergensHtml: string | null;
  isVariableWeight: boolean;
  shareUrl: string;
}

import type { NutritionFacts, ProcessingSignal } from './nutrition.ts';

/** A catalogue product enriched with its nutrition and processing signal. */
export interface EnrichedCatalogProduct extends CatalogProduct {
  nutrition: NutritionFacts;
  processing: ProcessingSignal;
}
