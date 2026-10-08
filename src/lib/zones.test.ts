import { describe, expect, it } from 'vitest';

import { makeProduct } from '../test-fixtures.ts';
import type { CatalogProduct, EnrichedCatalogProduct } from '../types/catalog.ts';
import type { CategorySection } from './category-tree.ts';
import {
  FALLBACK_ZONE,
  groupByZone,
  groupSectionsByZone,
  isMappedSection,
  SECTION_TO_ZONE,
  ZONES,
  zoneFor,
  type ZoneId,
} from './zones.ts';

function inSection(section: string, shelf = 'Estante', id = 1): CatalogProduct {
  return makeProduct({
    id,
    name: `${section} producto ${id}`,
    categoryPath: [
      { id: 90, name: section },
      { id: 91, name: shelf },
      { id: 92, name: 'Hoja' },
    ],
  });
}

const bebé = (shelf: string, id = 1): CatalogProduct =>
  makeProduct({
    id,
    name: `Bebé ${shelf}`,
    categoryPath: [
      { id: 20, name: 'Bebé' },
      { id: 21, name: shelf },
      { id: 22, name: 'Hoja' },
    ],
  });

describe('the zone vocabulary', () => {
  it('is seven zones, in the order a trip runs', () => {
    expect(ZONES.map((zone) => zone.id)).toEqual([
      'frescos',
      'mostrador',
      'despensa',
      'bebidas',
      'no-alimentacion',
      'refrigerados',
      'congelados',
    ]);
  });

  it('ends at the freezer, because melting cannot be undone', () => {
    const last = ZONES[ZONES.length - 1]!;
    expect(last.id).toBe('congelados');
    expect(last.why).toMatch(/derrit/i);
  });

  it('keeps non-food as its own block, but before the cold chain', () => {
    const ids = ZONES.map((zone) => zone.id);
    expect(ids.indexOf('no-alimentacion')).toBeGreaterThan(ids.indexOf('bebidas'));
    expect(ids.indexOf('no-alimentacion')).toBeLessThan(ids.indexOf('refrigerados'));
  });

  it('gives every zone a Spanish label and a reason for its place', () => {
    for (const zone of ZONES) {
      expect(zone.label.length).toBeGreaterThan(0);
      expect(zone.why.length).toBeGreaterThan(0);
      // No aisle numbers or shelf positions: Mercadona publishes no planogram, so
      // an aisle-level claim would be invented rather than measured.
      expect(zone.why).not.toMatch(/(pasillo|aisle|estante)\s*\d/i);
    }
  });
});

describe('zoneFor', () => {
  const expected: [string, ZoneId][] = [
    ['Fruta y verdura', 'frescos'],
    ['Carne', 'mostrador'],
    ['Marisco y pescado', 'mostrador'],
    ['Charcutería y quesos', 'mostrador'],
    ['Panadería y pastelería', 'mostrador'],
    ['Aceite, especias y salsas', 'despensa'],
    ['Conservas, caldos y cremas', 'despensa'],
    ['Arroz, legumbres y pasta', 'despensa'],
    ['Cacao, café e infusiones', 'despensa'],
    ['Cereales y galletas', 'despensa'],
    ['Azúcar, caramelos y chocolate', 'despensa'],
    ['Aperitivos', 'despensa'],
    ['Agua y refrescos', 'bebidas'],
    ['Zumos', 'bebidas'],
    ['Bodega', 'bebidas'],
    ['Limpieza y hogar', 'no-alimentacion'],
    ['Cuidado facial y corporal', 'no-alimentacion'],
    ['Cuidado del cabello', 'no-alimentacion'],
    ['Maquillaje', 'no-alimentacion'],
    ['Mascotas', 'no-alimentacion'],
    ['Fitoterapia y parafarmacia', 'no-alimentacion'],
    ['Huevos, leche y mantequilla', 'refrigerados'],
    ['Postres y yogures', 'refrigerados'],
    ['Pizzas y platos preparados', 'refrigerados'],
    ['Congelados', 'congelados'],
  ];

  it.each(expected)('puts %s in %s', (section, zone) => {
    expect(isMappedSection(section)).toBe(true);
    expect(zoneFor(inSection(section))).toBe(zone);
  });

  it('splits Bebé per product: formula is pantry, nappies are not food', () => {
    expect(zoneFor(bebé('Alimentación infantil'))).toBe('despensa');
    expect(zoneFor(bebé('Leche y bebidas vegetales'))).toBe('despensa');
    expect(zoneFor(bebé('Pañales y toallitas'))).toBe('no-alimentacion');
    expect(zoneFor(bebé('Higiene del bebé'))).toBe('no-alimentacion');
  });

  it('falls back visibly for a section it has never seen, rather than losing it', () => {
    const unseen = inSection('Charcutería vegana del futuro');
    expect(isMappedSection('Charcutería vegana del futuro')).toBe(false);
    expect(zoneFor(unseen)).toBe(FALLBACK_ZONE);
  });

  it('gives a product with no categories a zone rather than nothing', () => {
    expect(zoneFor(makeProduct({ id: 1, name: 'Sin categoría', categoryPath: [] }))).toBe(
      FALLBACK_ZONE,
    );
  });
});

describe('groupByZone', () => {
  const products: EnrichedCatalogProduct[] = [
    makeProduct({ id: 1, name: 'Manzana', categoryPath: [{ id: 3, name: 'Fruta y verdura' }, { id: 27, name: 'Fruta' }, { id: 853, name: 'Manzana' }] }),
    makeProduct({ id: 2, name: 'Leche', categoryPath: [{ id: 17, name: 'Huevos, leche y mantequilla' }, { id: 60, name: 'Leche' }, { id: 61, name: 'Entera' }] }),
    makeProduct({ id: 3, name: 'Pan', categoryPath: [{ id: 14, name: 'Panadería y pastelería' }, { id: 50, name: 'Pan' }, { id: 51, name: 'Horno' }] }),
  ];

  it('returns the zones in trip order, not the order they were found', () => {
    expect(groupByZone(products).map((group) => group.zone.id)).toEqual([
      'frescos',
      'mostrador',
      'refrigerados',
    ]);
  });

  it('groups the products that belong to each zone', () => {
    const groups = groupByZone(products);
    expect(groups[0]!.products.map((p) => p.id)).toEqual([1]);
    expect(groups[1]!.products.map((p) => p.id)).toEqual([3]);
    expect(groups[2]!.products.map((p) => p.id)).toEqual([2]);
  });

  it('omits a zone with nothing in it, rather than an empty heading', () => {
    expect(groupByZone(products).map((group) => group.zone.id)).not.toContain('congelados');
  });

  it('is deterministic for the same input', () => {
    const once = groupByZone(products).map((g) => g.products.map((p) => p.id));
    const twice = groupByZone([...products].reverse()).map((g) => g.products.map((p) => p.id));
    expect(twice).toEqual(once);
  });

  it('returns nothing for an empty list', () => {
    expect(groupByZone([])).toEqual([]);
  });
});

describe('groupSectionsByZone', () => {
  const section = (name: string, id: number): CategorySection => ({
    id,
    name,
    count: 1,
    shelves: [],
  });

  const tree = [
    section('Conservas, caldos y cremas', 1),
    section('Cuidado facial y corporal', 2),
    section('Fruta y verdura', 3),
    section('Limpieza y hogar', 4),
    section('Congelados', 5),
  ];

  it('returns the zones in trip order, whatever order the sections arrived in', () => {
    expect(groupSectionsByZone(tree).map((group) => group.zone.id)).toEqual([
      'frescos',
      'despensa',
      'no-alimentacion',
      'congelados',
    ]);
  });

  it('keeps every section exactly once, so none can be lost in the grouping', () => {
    const grouped = groupSectionsByZone(tree).flatMap((group) =>
      group.sections.map((entry) => entry.name),
    );
    expect([...grouped].sort()).toEqual(tree.map((entry) => entry.name).sort());
  });

  it('stops scattering non-food between the food sections', () => {
    const groups = groupSectionsByZone(tree);
    const nonFood = groups.find((group) => group.zone.id === 'no-alimentacion')!;
    const pantry = groups.find((group) => group.zone.id === 'despensa')!;

    expect(nonFood.sections.map((entry) => entry.name)).toEqual([
      'Cuidado facial y corporal',
      'Limpieza y hogar',
    ]);
    // Alphabetically, Cuidado facial sat between Conservas and Fruta.
    expect(pantry.sections.map((entry) => entry.name)).toEqual(['Conservas, caldos y cremas']);
  });

  it('omits a zone with no sections in it', () => {
    expect(groupSectionsByZone(tree).map((group) => group.zone.id)).not.toContain('bebidas');
  });

  it('returns nothing for no sections', () => {
    expect(groupSectionsByZone([])).toEqual([]);
  });
});

describe('the section table', () => {
  it('maps every section it names to exactly one real zone', () => {
    const names = Object.keys(SECTION_TO_ZONE);
    expect(names).toHaveLength(26);
    for (const name of names) {
      expect(ZONES.map((zone) => zone.id)).toContain(SECTION_TO_ZONE[name]);
    }
  });
});
