import { describe, expect, it } from 'vitest';

import { makeProduct } from '../test-fixtures.ts';
import type { EnrichedCatalogProduct } from '../types/catalog.ts';
import {
  defaultOrder,
  isCustomised,
  loadOrder,
  moveProduct,
  moveZone,
  nextMode,
  ORDER_STORAGE_KEY,
  orderWithinZone,
  orderZones,
  resetOrder,
  saveOrder,
  sortByName,
  type OrderPreference,
} from './ordering.ts';
import { ZONES } from './zones.ts';

const zoneIds = ZONES.map((zone) => zone.id);

function product(id: number, name: string): EnrichedCatalogProduct {
  return makeProduct({ id, name });
}

const leche = [product(1, 'Leche entera'), product(2, 'Leche desnatada'), product(3, 'Leche de avena')];

function storageWith(value: string | null) {
  const map = new Map<string, string>();
  if (value !== null) map.set(ORDER_STORAGE_KEY, value);
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, v: string) => void map.set(key, v),
  };
}

describe('the order preference', () => {
  it('starts as the proposal, with nothing customised', () => {
    const order = defaultOrder();
    expect(order.mode).toBe('trip');
    expect(order.zoneOrder).toEqual([]);
    expect(order.withinZone).toEqual({});
    expect(isCustomised(order)).toBe(false);
  });

  it('reports an arrangement as customised once either layer is set', () => {
    expect(isCustomised({ mode: 'custom', zoneOrder: ['bebidas'], withinZone: {} })).toBe(true);
    expect(isCustomised({ mode: 'custom', zoneOrder: [], withinZone: { bebidas: [2, 1] } })).toBe(
      true,
    );
  });

  it('switches mode without touching the layers, so A–Z cannot cost an arrangement', () => {
    const arranged: OrderPreference = {
      mode: 'custom',
      zoneOrder: ['bebidas', 'frescos'],
      withinZone: { bebidas: [2, 1] },
    };

    const az = nextMode(arranged, 'az');
    expect(az.mode).toBe('az');
    expect(az.zoneOrder).toEqual(arranged.zoneOrder);
    expect(az.withinZone).toEqual(arranged.withinZone);

    const back = nextMode(az, 'custom');
    expect(back).toEqual(arranged);
  });

  it('resets to the proposal and clears both layers', () => {
    expect(resetOrder()).toEqual(defaultOrder());
  });
});

describe('layer 1 — the zones', () => {
  it('follows the proposal when nothing is customised', () => {
    expect(orderZones(defaultOrder()).map((zone) => zone.id)).toEqual(zoneIds);
  });

  it('applies a custom order over the proposal', () => {
    const order: OrderPreference = {
      mode: 'custom',
      zoneOrder: ['congelados', 'frescos'],
      withinZone: {},
    };
    expect(orderZones(order).map((zone) => zone.id)[0]).toBe('congelados');
    expect(orderZones(order).map((zone) => zone.id)[1]).toBe('frescos');
  });

  it('keeps every zone: a stored order that names a few still yields all seven', () => {
    const order: OrderPreference = { mode: 'custom', zoneOrder: ['bebidas'], withinZone: {} };
    const ids = orderZones(order).map((zone) => zone.id);
    expect(ids).toHaveLength(ZONES.length);
    expect(ids[0]).toBe('bebidas');
    expect([...ids].sort()).toEqual([...zoneIds].sort());
  });

  it('ignores a zone id that is not real, rather than dropping a zone', () => {
    const order = {
      mode: 'custom',
      zoneOrder: ['bebidas', 'no-existe' as never],
      withinZone: {},
    } satisfies OrderPreference;
    const ids = orderZones(order).map((zone) => zone.id);
    expect(ids).toHaveLength(ZONES.length);
    expect(ids).toEqual(expect.arrayContaining([...zoneIds]));
  });
});

describe('reordering zones', () => {
  it('moves a zone up and records it as Mi orden', () => {
    const moved = moveZone(defaultOrder(), 'bebidas', 'up');
    expect(moved.mode).toBe('custom');
    expect(moved.zoneOrder.indexOf('bebidas')).toBe(zoneIds.indexOf('bebidas') - 1);
  });

  it('moves a zone down', () => {
    const moved = moveZone(defaultOrder(), 'frescos', 'down');
    expect(moved.zoneOrder.indexOf('frescos')).toBe(1);
  });

  it('does nothing at the top or the bottom, rather than wrapping round', () => {
    const top = moveZone(defaultOrder(), 'frescos', 'up');
    expect(top).toEqual(defaultOrder());

    const bottom = moveZone(defaultOrder(), 'congelados', 'down');
    expect(bottom).toEqual(defaultOrder());
  });

  it('keeps every zone after a move', () => {
    const moved = moveZone(defaultOrder(), 'congelados', 'up');
    expect([...moved.zoneOrder].sort()).toEqual([...zoneIds].sort());
  });
});

describe('layer 2 — within a zone', () => {
  it('leaves catalogue order when nothing is customised', () => {
    expect(orderWithinZone(defaultOrder(), 'refrigerados', leche).map((p) => p.id)).toEqual([
      1, 2, 3,
    ]);
  });

  it('puts the arranged products first, in the stored order', () => {
    const order: OrderPreference = {
      mode: 'custom',
      zoneOrder: [],
      withinZone: { refrigerados: [3, 1] },
    };
    expect(orderWithinZone(order, 'refrigerados', leche).map((p) => p.id)).toEqual([3, 1, 2]);
  });

  it('keeps a product added later after the arranged ones instead of losing it', () => {
    const order: OrderPreference = {
      mode: 'custom',
      zoneOrder: [],
      withinZone: { refrigerados: [3] },
    };
    expect(orderWithinZone(order, 'refrigerados', leche).map((p) => p.id)).toEqual([3, 1, 2]);
  });

  it('only applies while the mode is Mi orden', () => {
    const arranged: OrderPreference = {
      mode: 'custom',
      zoneOrder: [],
      withinZone: { refrigerados: [3, 1] },
    };
    expect(orderWithinZone(nextMode(arranged, 'trip'), 'refrigerados', leche).map((p) => p.id)).toEqual([
      1, 2, 3,
    ]);
    expect(orderWithinZone(nextMode(arranged, 'az'), 'refrigerados', leche).map((p) => p.id)).toEqual([
      1, 2, 3,
    ]);
  });

  it('does not mutate the products it was handed', () => {
    const order: OrderPreference = {
      mode: 'custom',
      zoneOrder: [],
      withinZone: { refrigerados: [3, 1] },
    };
    orderWithinZone(order, 'refrigerados', leche);
    expect(leche.map((p) => p.id)).toEqual([1, 2, 3]);
  });
});

describe('reordering products within a zone', () => {
  it('moves a product up and stores the whole arrangement', () => {
    const moved = moveProduct(defaultOrder(), 'refrigerados', 2, 'up', leche);
    expect(moved.mode).toBe('custom');
    expect(moved.withinZone.refrigerados).toEqual([2, 1, 3]);
  });

  it('moves a product down', () => {
    const moved = moveProduct(defaultOrder(), 'refrigerados', 1, 'down', leche);
    expect(moved.withinZone.refrigerados).toEqual([2, 1, 3]);
  });

  it('does nothing at the top, rather than wrapping round', () => {
    expect(moveProduct(defaultOrder(), 'refrigerados', 1, 'up', leche)).toEqual(defaultOrder());
  });

  it('does nothing at the bottom', () => {
    expect(moveProduct(defaultOrder(), 'refrigerados', 3, 'down', leche)).toEqual(defaultOrder());
  });

  it('does not disturb another zone', () => {
    const first = moveProduct(defaultOrder(), 'refrigerados', 2, 'up', leche);
    const second = moveProduct(first, 'despensa', 9, 'up', [product(9, 'Arroz')]);
    expect(second.withinZone.refrigerados).toEqual([2, 1, 3]);
  });
});

describe('A–Z', () => {
  it('sorts by name, the way a Spanish index does', () => {
    const products = [product(1, 'Zanahoria'), product(2, 'Aceite'), product(3, 'Ñora')];
    expect(sortByName(products).map((p) => p.name)).toEqual(['Aceite', 'Ñora', 'Zanahoria']);
  });

  it('does not reorder its input', () => {
    const products = [product(1, 'Zanahoria'), product(2, 'Aceite')];
    sortByName(products);
    expect(products.map((p) => p.id)).toEqual([1, 2]);
  });
});

describe('persistence', () => {
  it('round-trips the mode and both layers', () => {
    const storage = storageWith(null);
    const arranged: OrderPreference = {
      mode: 'custom',
      zoneOrder: ['bebidas', 'frescos'],
      withinZone: { bebidas: [2, 1] },
    };
    saveOrder(storage, arranged);
    expect(loadOrder(storage)).toEqual(arranged);
  });

  it('starts from the proposal when nothing is stored', () => {
    expect(loadOrder(storageWith(null))).toEqual(defaultOrder());
  });

  it('degrades to the proposal on corrupt JSON rather than throwing', () => {
    expect(loadOrder(storageWith('{not json'))).toEqual(defaultOrder());
  });

  it('degrades field by field on a partially valid value', () => {
    const stored = JSON.stringify({
      mode: 'nonsense',
      zoneOrder: 'not an array',
      withinZone: { bebidas: 'nope', frescos: [3, 1] },
    });
    expect(loadOrder(storageWith(stored))).toEqual({
      mode: 'trip',
      zoneOrder: [],
      withinZone: { frescos: [3, 1] },
    });
  });

  it('drops zone ids it cannot use instead of trusting them', () => {
    const stored = JSON.stringify({
      mode: 'custom',
      zoneOrder: ['bebidas', 'atlantis'],
      withinZone: {},
    });
    expect(loadOrder(storageWith(stored)).zoneOrder).toEqual(['bebidas']);
  });

  it('keeps a zone arrangement while that zone is empty', () => {
    const storage = storageWith(null);
    saveOrder(storage, {
      mode: 'custom',
      zoneOrder: [],
      withinZone: { refrigerados: [3, 1] },
    });

    const reloaded = loadOrder(storage);
    // Nothing in the zone right now...
    expect(orderWithinZone(reloaded, 'refrigerados', [])).toEqual([]);
    // ...and the arrangement is still there when it comes back.
    expect(orderWithinZone(reloaded, 'refrigerados', leche).map((p) => p.id)).toEqual([3, 1, 2]);
  });

  it('ignores stored ids the catalogue no longer has, keeping the rest', () => {
    const storage = storageWith(null);
    saveOrder(storage, {
      mode: 'custom',
      zoneOrder: [],
      withinZone: { refrigerados: [99, 3, 1] },
    });
    expect(orderWithinZone(loadOrder(storage), 'refrigerados', leche).map((p) => p.id)).toEqual([
      3, 1, 2,
    ]);
  });
});
