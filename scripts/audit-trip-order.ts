import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { buildCategoryTree } from '../src/lib/category-tree.ts';
import { groupSectionsByZone, groupByZone, ZONES, zoneFor } from '../src/lib/zones.ts';
import type { EnrichedCatalogProduct } from '../src/types/catalog.ts';

// The evidence behind SPEC-zones.md. Prints the vocabulary applied to the whole
// committed catalogue, so the zone table can be reviewed as data rather than
// trusted because the tests are green.

const products = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '..', 'public', 'catalog', 'products.json'), 'utf8'),
) as EnrichedCatalogProduct[];

console.log(`catalogue: ${products.length} products\n`);

console.log('zones, in the order a trip runs:');
for (const { zone, products: inZone } of groupByZone(products)) {
  const share = ((inZone.length / products.length) * 100).toFixed(1);
  console.log(
    `  ${String(ZONES.indexOf(zone) + 1).padStart(2)}. ${zone.label.padEnd(24)} ${String(inZone.length).padStart(5)}  ${share.padStart(5)}%   ${zone.why}`,
  );
}

const assigned = products.map(zoneFor).length;
console.log(`\nassigned: ${assigned} of ${products.length} (every product gets exactly one zone)`);
if (assigned !== products.length) throw new Error('a product was not assigned a zone');

console.log('\nbrowse tree, grouped by zone:');
for (const { zone, sections } of groupSectionsByZone(buildCategoryTree(products))) {
  const count = sections.reduce((sum, section) => sum + section.count, 0);
  console.log(`  ${zone.label} (${count})`);
  for (const section of sections) {
    console.log(`      ${section.name} — ${section.count}`);
  }
}

console.log('\nnon-food in its own block, before the cold chain:');
const order = ZONES.map((zone) => zone.id);
console.log(`  ${order.indexOf('no-alimentacion') + 1} non-food  <  ${order.indexOf('refrigerados') + 1} refrigerados  <  ${order.indexOf('congelados') + 1} congelados`);
