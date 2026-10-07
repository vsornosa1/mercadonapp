import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { isFoodProduct } from '../src/lib/alternatives.ts';
import type { EnrichedCatalogProduct } from '../src/types/catalog.ts';

// Task 19, step 1: which foods actually need generic values?

const products = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '..', 'public', 'catalog', 'products.json'), 'utf8'),
) as EnrichedCatalogProduct[];

const noData = products.filter((p) => p.nutrition.source === 'none' && isFoodProduct(p.categoryPath));

console.log(`products with NO nutrition at all : ${noData.length}`);
console.log(`  of which food                    : ${noData.length}`);

const byShelf = new Map<string, number>();
for (const p of noData) {
  const section = p.categoryPath[0]?.name ?? '?';
  const shelf = p.categoryPath[1]?.name ?? '?';
  const key = `${section} › ${shelf}`;
  byShelf.set(key, (byShelf.get(key) ?? 0) + 1);
}

console.log('\nby section › shelf (top 40):');
for (const [key, count] of [...byShelf].sort((a, b) => b[1] - a[1]).slice(0, 40)) {
  console.log(`  ${String(count).padStart(4)}  ${key}`);
}

// How many DISTINCT foods would a table need? Names in fresh sections are
// near-duplicates ("Patata", "Patatas", "Patatas rojas"), so the distinct count
// is what sizes the curation work.
console.log('\n--- distinct-name estimate in the fresh sections ---');
const FRESH = new Set(['Fruta y verdura', 'Carne', 'Marisco y pescado', 'Panadería y pastelería']);
const fresh = noData.filter((p) => FRESH.has(p.categoryPath[0]?.name ?? ''));
console.log(`fresh products with no data: ${fresh.length}`);
const names = new Set(fresh.map((p) => p.name.trim().toLowerCase()));
console.log(`distinct names             : ${names.size}`);
console.log('\nsample names:');
for (const name of [...names].slice(0, 30)) console.log(`  ${name}`);

console.log('\n--- distinct names per section ---');
const bySection = new Map<string, Set<string>>();
for (const p of noData) {
  const section = p.categoryPath[0]?.name ?? '?';
  const set = bySection.get(section) ?? new Set<string>();
  set.add(p.name.trim().toLowerCase());
  bySection.set(section, set);
}
for (const [section, set] of [...bySection].sort((a, b) => b[1].size - a[1].size)) {
  console.log(`  ${String(set.size).padStart(4)} distinct  ${section}`);
}
