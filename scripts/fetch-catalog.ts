import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { summarizeCatalog, type RawProduct } from './summarize.ts';
import { buildCategoryIndex, topLevelCategoryIds, type CategoryNode } from './category-index.ts';

// Downloads the datania/mercadona-catalog snapshot from Hugging Face.
// The catalogue comes from this mirror and ONLY from this mirror — Mercadona's
// robots.txt disallows /api and its abuse detector blocks scrapers. The
// network-hygiene test asserts this script never mentions the Mercadona domain.

const BASE_URL = 'https://huggingface.co/datasets/datania/mercadona-catalog/resolve/main';
const RAW_DIR = resolve(import.meta.dirname, '..', 'data', 'raw');
const PRODUCTS_DIR = join(RAW_DIR, 'products');
const CATEGORIES_DIR = join(RAW_DIR, 'categories');

const CONCURRENCY = 4;
const START_DELAY_MS = 100;
const MAX_RETRIES = 5;

function delay(ms: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function fetchResponse(url: string, attempt = 0): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { 'user-agent': 'mercadonapp-catalog-sync/0.1 (single-user app; polite mirror download)' },
    });
  } catch (error) {
    if (attempt >= MAX_RETRIES) throw error;
    await delay(1000 * 2 ** attempt);
    return fetchResponse(url, attempt + 1);
  }

  if (response.ok) return response;

  // Honour the mirror's rate-limit signal instead of hammering through it.
  if (response.status === 429 || response.status === 503) {
    const retryAfter = Number(response.headers.get('retry-after'));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 5000 * 2 ** attempt;
    if (attempt < MAX_RETRIES) {
      console.warn(`  ${response.status} for ${url}; waiting ${Math.round(waitMs / 1000)}s (retry ${attempt + 1}/${MAX_RETRIES})`);
      await delay(waitMs);
      return fetchResponse(url, attempt + 1);
    }
  }

  throw new Error(`HTTP ${response.status} for ${url}`);
}

async function saveFile(url: string, dest: string): Promise<void> {
  if (existsSync(dest)) return; // resumable — a present file is never re-fetched
  const response = await fetchResponse(url);
  writeFileSync(dest, Buffer.from(await response.arrayBuffer()));
}

async function runPool<T>(items: readonly T[], worker: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  async function consume(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      await worker(items[index]!);
      await delay(START_DELAY_MS);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => consume()));
}

async function main(): Promise<void> {
  mkdirSync(PRODUCTS_DIR, { recursive: true });
  mkdirSync(CATEGORIES_DIR, { recursive: true });

  console.log(`downloading index and category tree from ${BASE_URL}`);

  await saveFile(`${BASE_URL}/product_ids.json`, join(RAW_DIR, 'product_ids.json'));
  await saveFile(`${BASE_URL}/categories.json`, join(RAW_DIR, 'categories.json'));

  const index = JSON.parse(readFileSync(join(RAW_DIR, 'product_ids.json'), 'utf8')) as {
    count: number;
    product_ids: string[];
  };
  const ids = index.product_ids;

  const categoriesJson = JSON.parse(readFileSync(join(RAW_DIR, 'categories.json'), 'utf8')) as unknown;
  const topLevelIds = topLevelCategoryIds(categoriesJson);
  let categoryFilesFetched = 0;
  const failedCategories: number[] = [];
  await runPool(topLevelIds, async (categoryId) => {
    try {
      await saveFile(
        `${BASE_URL}/categories/${categoryId}.json`,
        join(CATEGORIES_DIR, `${categoryId}.json`),
      );
      categoryFilesFetched += 1;
    } catch (error) {
      failedCategories.push(categoryId);
      console.error(`failed to download category ${categoryId}: ${(error as Error).message}`);
    }
  });
  if (failedCategories.length > 0) {
    console.error(`missing category files: ${failedCategories.join(', ')}`);
  }

  console.log(`downloading ${ids.length} products (concurrency ${CONCURRENCY})...`);
  let downloaded = 0;
  await runPool(ids, async (id) => {
    const dest = join(PRODUCTS_DIR, `${id}.json`);
    if (existsSync(dest)) {
      downloaded += 1;
      return;
    }
    try {
      await saveFile(`${BASE_URL}/products/${id}.json`, dest);
      downloaded += 1;
    } catch (error) {
      console.error(`failed to download product ${id}: ${(error as Error).message}`);
    }
    if (downloaded % 500 === 0) {
      console.log(`  ${downloaded}/${ids.length}`);
    }
  });

  const files = readdirSync(PRODUCTS_DIR).filter((f) => f.endsWith('.json'));
  const missing = ids.filter((id) => !files.includes(`${id}.json`));

  const products = files.map((file) => {
    return JSON.parse(readFileSync(join(PRODUCTS_DIR, file), 'utf8')) as RawProduct;
  });
  const summary = summarizeCatalog(products);

  // Category lineage comes from the tree, not from product files.
  const categoryFileObjects = readdirSync(CATEGORIES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(CATEGORIES_DIR, f), 'utf8')) as CategoryNode);
  const categoryIndex = buildCategoryIndex(categoryFileObjects);

  console.log('');
  console.log('=== catalogue summary ===');
  console.log(`category files fetched : ${categoryFilesFetched}`);
  console.log(`product ids in index  : ${ids.length}`);
  console.log(`product files on disk : ${files.length}`);
  console.log(`missing product files : ${missing.length}`);
  if (missing.length > 0) {
    console.log(`  missing ids: ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? ', ...' : ''}`);
  }
  console.log(`with ean               : ${summary.withEan}`);
  console.log(`with ingredients       : ${summary.withIngredients}`);
  console.log(`with photos            : ${summary.withPhotos}`);
  console.log(`with category lineage  : ${categoryIndex.size}`);
  console.log(`  (leaf categories    : ${new Set([...categoryIndex.values()].map((p) => p.leafId)).size})`);
  console.log('');
  console.log('done. zero requests were made to any Mercadona host.');
}

await main();
