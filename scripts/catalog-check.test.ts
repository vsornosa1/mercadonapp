import { describe, expect, it } from 'vitest';

import { checkCatalog } from './catalog-check.ts';

describe('checkCatalog', () => {
  it('passes for a real-shaped catalogue', () => {
    const products = Array.from({ length: 1200 }, (_, i) => ({ id: i }));
    const result = checkCatalog('/does-not-matter', () => JSON.stringify(products));
    expect(result.ok).toBe(true);
    expect(result.count).toBe(1200);
  });

  it('fails when the file is absent, naming the path', () => {
    const result = checkCatalog('/tmp/products.json', () => null);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('/tmp/products.json');
  });

  it('fails on unparseable JSON', () => {
    expect(checkCatalog('p', () => '{not json').ok).toBe(false);
    expect(checkCatalog('p', () => '{not json').reason).toMatch(/JSON/i);
  });

  it('fails when the payload is not an array', () => {
    expect(checkCatalog('p', () => '{"count":5}').ok).toBe(false);
  });

  it('fails when the catalogue is suspiciously small — a truncated bundle must not ship', () => {
    const result = checkCatalog('p', () => JSON.stringify([{ id: 1 }, { id: 2 }]));
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/2/);
  });
});
