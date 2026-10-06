import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { classifyProduct, extractOffSignals, seededTake, type ProductGroup } from './off-fields.ts';
import { fetchOffProduct } from './off-client.ts';
import type { RawProduct } from './summarize.ts';

// Task 6 — the fail-fast coverage spike. Measures the REAL Open Food Facts
// hit-rate for the live catalogue, stratified by bulk (fresh counters) vs
// packaged, and by brand group. Replaces the brand-level proxy from research
// with a number, before any UI is built on top of nutrition.

const RAW_DIR = resolve(import.meta.dirname, '..', 'data', 'raw');
const PRODUCTS_DIR = join(RAW_DIR, 'products');
const DELAY_MS = 1100; // stay well under OFF's 100 req/min
const SEED = 20261006;

const SAMPLE = { bulk: 90, hacendado: 80, other: 80 };

interface Bucket {
  group: ProductGroup;
  bulk: boolean;
}

function bucketOf(product: RawProduct): Bucket {
  const bulk = product.is_bulk === true;
  if (bulk) return { group: classifyProduct(product), bulk: true };
  if (classifyProduct(product) === 'hacendado') return { group: 'hacendado', bulk: false };
  return { group: 'other-brand', bulk: false };
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  const products = readdirSync(PRODUCTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(PRODUCTS_DIR, f), 'utf8')) as RawProduct);

  const bulk = products.filter((p) => p.is_bulk === true);
  const hacendado = products.filter((p) => p.is_bulk !== true && classifyProduct(p) === 'hacendado');
  const other = products.filter(
    (p) => p.is_bulk !== true && classifyProduct(p) !== 'hacendado',
  );

  console.log(`catalogue: ${products.length} products | bulk ${bulk.length} | hacendado ${hacendado.length} | other ${other.length}`);

  const sample: { product: RawProduct; bucket: Bucket }[] = [
    ...seededTake(bulk, SEED, SAMPLE.bulk).map((p) => ({ product: p, bucket: bucketOf(p) })),
    ...seededTake(hacendado, SEED, SAMPLE.hacendado).map((p) => ({ product: p, bucket: bucketOf(p) })),
    ...seededTake(other, SEED, SAMPLE.other).map((p) => ({ product: p, bucket: bucketOf(p) })),
  ];

interface Result {
  id: number | string;
  ean: string | null;
  group: ProductGroup;
  bulk: boolean;
  found: boolean;
  hasKcal: boolean;
  hasProtein: boolean;
  hasNova: boolean;
}

  const results: Result[] = [];
  for (const { product, bucket } of sample) {
    let signals = { found: false, hasKcal: false, hasProtein: false, hasNova: false };
    if (product.ean) {
      try {
        signals = extractOffSignals(await fetchOffProduct(product.ean));
      } catch {
        signals = { found: false, hasKcal: false, hasProtein: false, hasNova: false };
      }
      await delay(DELAY_MS);
    }
    results.push({
      id: product.id,
      ean: product.ean ?? null,
      group: bucket.group,
      bulk: bucket.bulk,
      ...signals,
    });
  }

  writeFileSync(join(RAW_DIR, 'coverage-sample.json'), JSON.stringify(results, null, 2));

  const report = (label: string, items: typeof results) => {
    const found = items.filter((r) => r.found).length;
    const n = items.length || 1;
    const pct = (k: number) => `${((k / n) * 100).toFixed(0)}%`;
    console.log(
      `${label.padEnd(20)} n=${String(items.length).padStart(3)}  found=${pct(found)}  kcal=${pct(items.filter((r) => r.hasKcal).length)}  protein=${pct(items.filter((r) => r.hasProtein).length)}  nova=${pct(items.filter((r) => r.hasNova).length)}`,
    );
  };

  console.log('');
  console.log('=== OFF coverage (seeded sample) ===');
  report('bulk (fresh)', results.filter((r) => r.bulk));
  report('hacendado packaged', results.filter((r) => !r.bulk && r.group === 'hacendado'));
  report('other packaged', results.filter((r) => !r.bulk && r.group !== 'hacendado'));
  report('TOTAL', results);
  console.log('');
  console.log(`results written to data/raw/coverage-sample.json`);
}

await main();
