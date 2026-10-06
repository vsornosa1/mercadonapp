import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, resolve } from 'node:path';

import { buildCategoryIndex, type CategoryNode } from './category-index.ts';
import type { RawProduct } from './summarize.ts';
import { toCatalogProduct } from './to-product.ts';
import type { CatalogProduct } from '../src/types/catalog.ts';

// Task 7 — emits the slim catalogue bundle the app ships. Weighs it gzipped and
// fails above the budget, because the bundle is downloaded to a phone and its
// weight is a product decision, not an implementation detail.

const RAW_DIR = resolve(import.meta.dirname, '..', 'data', 'raw');
const PRODUCTS_DIR = join(RAW_DIR, 'products');
const CATEGORIES_DIR = join(RAW_DIR, 'categories');
const OUT_DIR = resolve(import.meta.dirname, '..', 'public', 'catalog');
const OUT_FILE = join(OUT_DIR, 'products.json');

const GZIP_BUDGET_BYTES = 1_500_000;

async function main(): Promise<void> {
  const files = readdirSync(PRODUCTS_DIR).filter((f) => f.endsWith('.json'));
  const rawProducts = files.map(
    (f) => JSON.parse(readFileSync(join(PRODUCTS_DIR, f), 'utf8')) as RawProduct,
  );

  const categoryNodes = readdirSync(CATEGORIES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(CATEGORIES_DIR, f), 'utf8')) as CategoryNode);
  const lineage = buildCategoryIndex(categoryNodes);

  const products: CatalogProduct[] = [];
  const missingLineage: (number | string)[] = [];
  for (const raw of rawProducts) {
    const path = lineage.get(raw.id!);
    if (!path) {
      missingLineage.push(raw.id!);
      continue;
    }
    products.push(toCatalogProduct(raw, path));
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const json = JSON.stringify(products);
  writeFileSync(OUT_FILE, json);

  const gzipBytes = gzipSync(Buffer.from(json), { level: 9 }).length;
  const rawBytes = Buffer.byteLength(json);

  console.log(`products emitted   : ${products.length}`);
  console.log(`products skipped   : ${missingLineage.length} (no category lineage)`);
  if (missingLineage.length > 0) {
    console.log(`  skipped ids: ${missingLineage.slice(0, 20).join(', ')}`);
  }
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
