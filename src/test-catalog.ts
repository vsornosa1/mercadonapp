import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { EnrichedCatalogProduct } from './types/catalog.ts';

/**
 * The committed catalogue bundle.
 *
 * Some claims are only worth making against all 4,330 products — "every product
 * gets a zone", "every count equals the list it opens". A fixture would prove the
 * code does what the fixture says, which is not the question. The bundle is
 * committed and `prebuild` fails without it, so this cannot silently pass by
 * finding nothing.
 */
const CATALOG_PATH = resolve(process.cwd(), 'public', 'catalog', 'products.json');

let cached: EnrichedCatalogProduct[] | null = null;

export function loadCatalog(): EnrichedCatalogProduct[] {
  if (cached === null) {
    cached = JSON.parse(readFileSync(CATALOG_PATH, 'utf8')) as EnrichedCatalogProduct[];
    if (cached.length < 1000) {
      throw new Error(`expected the full catalogue at ${CATALOG_PATH}, got ${cached.length}`);
    }
  }
  return cached;
}

/** The distinct section names in the catalogue, in the order they first appear. */
export function sectionNames(products: readonly EnrichedCatalogProduct[]): string[] {
  return [...new Set(products.map((p) => p.categoryPath[0]?.name).filter((n) => n !== undefined))];
}
