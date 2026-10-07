import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { checkCatalog } from './catalog-check.ts';

// Runs as `prebuild`. Fails loudly rather than shipping an app whose search
// silently returns nothing because the catalogue was never built.

const catalogPath = resolve(import.meta.dirname, '..', 'public', 'catalog', 'products.json');

const result = checkCatalog(catalogPath, (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null));

if (!result.ok) {
  console.error('');
  console.error('  El catálogo no está listo para publicar.');
  console.error(`  Motivo: ${result.reason}`);
  console.error('');
  console.error('  Genera el bundle antes de construir:');
  console.error('    npm run data:fetch && npm run data:build');
  console.error('');
  process.exit(1);
}

console.log(`catálogo verificado: ${result.count} productos en public/catalog/products.json`);
