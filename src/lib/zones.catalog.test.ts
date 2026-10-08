import { describe, expect, it } from 'vitest';

import { loadCatalog, sectionNames } from '../test-catalog.ts';
import { buildCategoryTree } from './category-tree.ts';
import { groupSectionsByZone, isMappedSection, SECTION_TO_ZONE, zoneFor, ZONES } from './zones.ts';

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

  it('classifies every section by hand rather than letting any fall back', () => {
    // isMappedSection covers the table; this asserts the table is complete for the
    // real shop, so a new Mercadona section cannot arrive and silently land in the
    // fallback zone.
    const sectionsInData = sectionNames(catalog);
    expect(sectionsInData).toHaveLength(26);
    expect(Object.keys(SECTION_TO_ZONE).sort()).toEqual([...sectionsInData].sort());
  });

  it('files the baby section by its food shelves, and says so', () => {
    // Bebé spans two zones and the browse tree can only put the section in one, so
    // it follows its food shelves. The cart does not have this limitation: it
    // resolves per product, which the test above asserts.
    expect(SECTION_TO_ZONE['Bebé']).toBe('despensa');
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

  it('groups the real browse tree without losing or duplicating a section', () => {
    const tree = buildCategoryTree(catalog);
    const groups = groupSectionsByZone(tree);

    const grouped = groups.flatMap((group) => group.sections.map((section) => section.name));
    expect([...grouped].sort()).toEqual([...tree.map((section) => section.name)].sort());
    expect(groups.length).toBeGreaterThan(1);
    expect(groups.every((group) => group.sections.length > 0)).toBe(true);
  });

  it('ends the browse order with the frozen section and keeps non-food together', () => {
    const groups = groupSectionsByZone(buildCategoryTree(catalog));
    const last = groups[groups.length - 1]!;
    expect(last.zone.id).toBe('congelados');

    const nonFood = groups.find((group) => group.zone.id === 'no-alimentacion')!;
    const names = nonFood.sections.map((section) => section.name);
    expect(names).toContain('Limpieza y hogar');
    expect(names).toContain('Cuidado facial y corporal');
    expect(names).not.toContain('Conservas, caldos y cremas');
  });
});
