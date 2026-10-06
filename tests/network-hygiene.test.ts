import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const projectRoot = resolve(import.meta.dirname, '..');
const scriptsDir = resolve(projectRoot, 'scripts');

// The whole data strategy rests on one rule: the catalogue comes from a mirror,
// never from Mercadona. robots.txt disallows their /api and their abuse detector
// hard-blocks scrapers. This test asserts the rule at the source level, so a
// future change cannot silently reintroduce scraping.
describe('network hygiene', () => {
  const scriptFiles = existsSync(scriptsDir)
    ? readdirSync(scriptsDir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    : [];

  it('has a fetch-catalog entry point', () => {
    expect(existsSync(resolve(scriptsDir, 'fetch-catalog.ts')), 'scripts/fetch-catalog.ts must exist').toBe(
      true,
    );
  });

  it('never references tienda.mercadona.es in any pipeline script', () => {
    expect(scriptFiles.length, 'pipeline scripts must exist').toBeGreaterThan(0);
    for (const file of scriptFiles) {
      const source = readFileSync(resolve(scriptsDir, file), 'utf8');
      expect(source, `${file} must not reference the Mercadona domain`).not.toContain(
        'tienda.mercadona.es',
      );
    }
  });
});
