import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, resolve } from 'node:path';

import { buildCategoryIndex, type CategoryNode } from './category-index.ts';
import type { EnrichedProduct } from './enrich.ts';
import type { RawProduct } from './summarize.ts';
import { toCatalogProduct } from './to-product.ts';
import type { EnrichedCatalogProduct } from '../src/types/catalog.ts';
import type { NutritionFacts, ProcessingSignal } from '../src/types/nutrition.ts';

// Task 7/12 — emits the slim, enriched catalogue bundle the app ships, merging
// the Open Food Facts + processing enrichment produced by data:enrich. Weighs
// it gzipped and fails above the budget: the bundle is downloaded to a phone.

const RAW_DIR = resolve(import.meta.dirname, '..', 'data', 'raw');
const PRODUCTS_DIR = join(RAW_DIR, 'products');
const CATEGORIES_DIR = join(RAW_DIR, 'categories');
const ENRICHED_FILE = resolve(import.meta.dirname, '..', 'data', 'enriched', 'enriched.json');
const OUT_DIR = resolve(import.meta.dirname, '..', 'public', 'catalog');
const OUT_FILE = join(OUT_DIR, 'products.json');

const GZIP_BUDGET_BYTES = 1_500_000;

const NONE_NUTRITION: NutritionFacts = { source: 'none', per100: null, novaGroup: null, additives: [] };
const UNKNOWN_PROCESSING: ProcessingSignal = {
  basis: 'ingredient-heuristic',
  tier: 'unknown',
  additiveMarkers: [],
};

async function main(): Promise<void> {
  const files = readdirSync(PRODUCTS_DIR).filter((f) => f.endsWith('.json'));
  const rawProducts = files.map(
    (f) => JSON.parse(readFileSync(join(PRODUCTS_DIR, f), 'utf8')) as RawProduct,
  );

  const categoryNodes = readdirSync(CATEGORIES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(CATEGORIES_DIR, f), 'utf8')) as CategoryNode);
  const lineage = buildCategoryIndex(categoryNodes);

  const enrichedById = new Map<number, EnrichedProduct>();
  if (existsSync(ENRICHED_FILE)) {
    const enriched = JSON.parse(readFileSync(ENRICHED_FILE, 'utf8')) as EnrichedProduct[];
    for (const entry of enriched) enrichedById.set(entry.id, entry);
  }

  const products: EnrichedCatalogProduct[] = [];
  const missingLineage: (number | string)[] = [];
  for (const raw of rawProducts) {
    const path = lineage.get(raw.id!);
    if (!path) {
      missingLineage.push(raw.id!);
      continue;
    }
    const catalogProduct = toCatalogProduct(raw, path);
    const enriched = enrichedById.get(catalogProduct.id);
    products.push({
      ...catalogProduct,
      nutrition: enriched?.nutrition ?? NONE_NUTRITION,
      processing: enriched?.processing ?? UNKNOWN_PROCESSING,
    });
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const json = JSON.stringify(products);
  writeFileSync(OUT_FILE, json);

  const gzipBytes = gzipSync(Buffer.from(json), { level: 9 }).length;
  const rawBytes = Buffer.byteLength(json);
  const withKcal = products.filter((p) => p.nutrition.per100?.kcal != null).length;

  console.log(`products emitted   : ${products.length}`);
  console.log(`products skipped   : ${missingLineage.length} (no category lineage)`);
  if (missingLineage.length > 0) {
    console.log(`  skipped ids: ${missingLineage.slice(0, 20).join(', ')}`);
  }
  console.log(`with kcal          : ${withKcal} (${((withKcal / products.length) * 100).toFixed(0)}%)`);
  console.log(`raw size           : ${(rawBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`gzipped size       : ${(gzipBytes / 1024 / 1024).toFixed(2)} MB`);

  if (gzipBytes > GZIP_BUDGET_BYTES) {
    throw new Error(
      `bundle is ${(gzipBytes / 1024 / 1024).toFixed(2)} MB gzipped, over the ${GZIP_BUDGET_BYTES / 1024 / 1024} MB budget`,
    );
  }
  console.log(`within budget (≤ ${GZIP_BUDGET_BYTES / 1024 / 1024} MB)`);
}

await main();
