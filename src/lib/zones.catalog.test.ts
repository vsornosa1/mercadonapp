import { describe, expect, it } from 'vitest';

import { loadCatalog, sectionNames } from '../test-catalog.ts';
import { isMappedSection, zoneFor, ZONES } from './zones.ts';

/**
 * The mapping is only worth trusting if it holds for the whole shop.
 *
 * These assertions run against the committed bundle — all 4,330 products — because
 * a fixture would only prove that the code does what the fixture says. A new
 * Mercadona section that nobody has classified fails here rather than quietly
 * disappearing into the fallback.
 */
const catalog = loadCatalog();

describe('the zone vocabulary against the real catalogue', () => {
  it('gives every product exactly one zone, and the zone counts add up to the shop', () => {
    const zoneIds = new Set<string>(ZONES.map((zone) => zone.id));
    const counts = new Map<string, number>();

    for (const product of catalog) {
      const zone = zoneFor(product);
      expect(zoneIds.has(zone)).toBe(true);
      counts.set(zone, (counts.get(zone) ?? 0) + 1);
    }

    const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
    expect(total).toBe(catalog.length);
  });

  it('knows every section the catalogue actually contains', () => {
    expect(sectionNames(catalog).filter((name) => !isMappedSection(name))).toEqual([]);
  });

  it('uses every zone, so none is dead vocabulary', () => {
    const used = new Set(catalog.map(zoneFor));
    expect([...used].sort()).toEqual([...ZONES.map((zone) => zone.id)].sort());
  });

  it('splits Bebé by product: formula is pantry, nappies are not food', () => {
    const inBebe = (shelf: string) =>
      catalog.filter(
        (product) =>
          product.categoryPath[0]?.name === 'Bebé' && product.categoryPath[1]?.name === shelf,
      );

    const formula = inBebe('Alimentación infantil');
    const nappies = inBebe('Toallitas y pañales');

    // Non-vacuous: without these the assertions below would pass on empty arrays.
    expect(formula.length).toBeGreaterThan(0);
    expect(nappies.length).toBeGreaterThan(0);

    expect(new Set(formula.map(zoneFor))).toEqual(new Set(['despensa']));
    expect(new Set(nappies.map(zoneFor))).toEqual(new Set(['no-alimentacion']));
  });

  it('puts the cold chain last and non-food before it, on real products', () => {
    const zoneIndex = new Map(ZONES.map((zone, index) => [zone.id, index]));
    const frozen = catalog.filter((product) => product.categoryPath[0]?.name === 'Congelados');
    const cosmetics = catalog.filter(
      (product) => product.categoryPath[0]?.name === 'Maquillaje',
    );

    expect(frozen.length).toBeGreaterThan(0);
    expect(new Set(frozen.map(zoneFor))).toEqual(new Set(['congelados']));
    expect(new Set(cosmetics.map(zoneFor))).toEqual(new Set(['no-alimentacion']));

    expect(zoneIndex.get('congelados')).toBe(ZONES.length - 1);
    expect(zoneIndex.get('no-alimentacion')!).toBeLessThan(zoneIndex.get('refrigerados')!);
  });
});
