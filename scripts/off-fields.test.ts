import { describe, expect, it } from 'vitest';

import { classifyProduct, extractOffSignals, seededTake } from './off-fields.ts';

describe('classifyProduct', () => {
  it('groups Hacendado as the store food brand', () => {
    expect(classifyProduct({ id: 1, brand: 'Hacendado' })).toBe('hacendado');
  });

  it('groups Mercadona non-food own-brands separately', () => {
    expect(classifyProduct({ id: 2, brand: 'Deliplus' })).toBe('non-food-own');
    expect(classifyProduct({ id: 3, brand: 'Bosque Verde' })).toBe('non-food-own');
  });

  it('groups a missing or empty brand as unbranded (fresh counters)', () => {
    expect(classifyProduct({ id: 4, brand: '' })).toBe('unbranded');
    expect(classifyProduct({ id: 5, brand: null })).toBe('unbranded');
    expect(classifyProduct({ id: 6 })).toBe('unbranded');
  });

  it('groups everything else as another brand', () => {
    expect(classifyProduct({ id: 7, brand: 'Milka' })).toBe('other-brand');
  });
});

describe('extractOffSignals', () => {
  it('reports not-found for a status-0 response', () => {
    expect(extractOffSignals({ status: 0 })).toEqual({
      found: false,
      hasKcal: false,
      hasProtein: false,
      hasNova: false,
    });
  });

  it('extracts kcal/protein/nova presence from a found response', () => {
    expect(
      extractOffSignals({
        status: 1,
        product: { nutriments: { 'energy-kcal_100g': 265, proteins_100g: 10 }, nova_group: 4 },
      }),
    ).toEqual({ found: true, hasKcal: true, hasProtein: true, hasNova: true });
  });

  it('treats a found product with missing nutriments as found-but-empty', () => {
    expect(extractOffSignals({ status: 1, product: {} })).toEqual({
      found: true,
      hasKcal: false,
      hasProtein: false,
      hasNova: false,
    });
  });

  it('accepts a string status as found', () => {
    expect(extractOffSignals({ status: '1', product: { nutriments: { 'energy-kcal_100g': 1 } } }).found).toBe(
      true,
    );
  });
});

describe('seededTake', () => {
  const items = [10, 20, 30, 40, 50, 60, 70, 80];

  it('is deterministic for the same seed', () => {
    expect(seededTake(items, 42, 4)).toEqual(seededTake(items, 42, 4));
  });

  it('returns exactly n items with no duplicates, all drawn from the input', () => {
    const sample = seededTake(items, 7, 5);
    expect(sample).toHaveLength(5);
    expect(new Set(sample).size).toBe(5);
    for (const value of sample) {
      expect(items).toContain(value);
    }
  });

  it('returns the whole input when n exceeds its length', () => {
    expect(seededTake(items, 1, 100)).toHaveLength(items.length);
  });
});
