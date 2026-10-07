import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { buildCategoryIndex, type CategoryNode } from './category-index.ts';
import { enrichProduct, type EnrichedProduct } from './enrich.ts';
import { fetchOffProduct } from './off-client.ts';
import type { RawProduct } from './summarize.ts';

// Task 12 — the enrichment join. Fetches Open Food Facts for every packaged
// product (by EAN), caches each response so a re-run is incremental and a
// crashed run resumes, and composes the processing signal (NOVA → ingredient
// heuristic → category rule). Fresh/variable-weight PLU codes are skipped —
// they can never be in OFF — and handled by the category rule instead.

const RAW_DIR = resolve(import.meta.dirname, '..', 'data', 'raw');
const PRODUCTS_DIR = join(RAW_DIR, 'products');
const CATEGORIES_DIR = join(RAW_DIR, 'categories');
const ENRICHED_DIR = resolve(import.meta.dirname, '..', 'data', 'enriched');
const CACHE_DIR = resolve(import.meta.dirname, '..', 'data', 'cache', 'off');
const OUT_FILE = join(ENRICHED_DIR, 'enriched.json');
const DELAY_MS = 1100;

function isLookupEan(ean: string): boolean {
  return ean !== '' && !ean.startsWith('210'); // 210-prefix = variable-weight PLU, never in OFF
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function pct(part: number, whole: number): string {
  return whole === 0 ? 'n/a' : `${((part / whole) * 100).toFixed(0)}%`;
}

async function main(): Promise<void> {
  mkdirSync(CACHE_DIR, { recursive: true });
  mkdirSync(ENRICHED_DIR, { recursive: true });

  const products = readdirSync(PRODUCTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(PRODUCTS_DIR, f), 'utf8')) as RawProduct);

  const categoryNodes = readdirSync(CATEGORIES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(CATEGORIES_DIR, f), 'utf8')) as CategoryNode);
  const lineage = buildCategoryIndex(categoryNodes);

  const enriched: EnrichedProduct[] = [];
  let lookups = 0;
  let cached = 0;

  for (const raw of products) {
    const ean = raw.ean ?? '';
    let offJson: unknown = { status: 0 };
    if (isLookupEan(ean)) {
      const cachePath = join(CACHE_DIR, `${ean}.json`);
      if (existsSync(cachePath)) {
        offJson = JSON.parse(readFileSync(cachePath, 'utf8'));
        cached += 1;
      } else {
        offJson = await fetchOffProduct(ean);
        writeFileSync(cachePath, JSON.stringify(offJson));
        await delay(DELAY_MS);
      }
      lookups += 1;
    }
    enriched.push(enrichProduct(raw, lineage.get(raw.id!), offJson));
    if (enriched.length % 500 === 0) {
      console.log(`  ${enriched.length}/${products.length} (${cached} from cache)`);
    }
  }

  writeFileSync(OUT_FILE, JSON.stringify(enriched));

  const total = enriched.length;
  const withKcal = enriched.filter((e) => e.nutrition.per100?.kcal != null).length;
  const withProtein = enriched.filter((e) => e.nutrition.per100?.protein != null).length;
  const withNova = enriched.filter((e) => e.nutrition.novaGroup != null).length;

  console.log('');
  console.log('=== enrichment summary ===');
  console.log(`products enriched   : ${total}`);
  console.log(`OFF lookups         : ${lookups} (${cached} from cache)`);
  console.log(`with kcal           : ${withKcal} (${pct(withKcal, total)})`);
  console.log(`with protein        : ${withProtein} (${pct(withProtein, total)})`);
  console.log(`with nova_group     : ${withNova} (${pct(withNova, total)})`);
}

await main();
