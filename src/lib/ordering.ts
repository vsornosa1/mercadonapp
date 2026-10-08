import type { CatalogProduct } from '../types/catalog.ts';
import { ZONES, type Zone, type ZoneId } from './zones.ts';

/**
 * How the list is sequenced.
 *
 * The app already refuses to show a processing claim the evidence does not
 * support. An order we guessed and the user cannot change is the same overreach,
 * so the proposal is a **default, never a verdict** — hence the custom layers.
 */
export type OrderMode = 'trip' | 'custom' | 'az';

export interface OrderPreference {
  mode: OrderMode;
  /** Layer 1: the order of the zones themselves. Empty means "use the proposal". */
  zoneOrder: ZoneId[];
  /** Layer 2: product ids, in order, per zone. A zone with no entry keeps catalogue order. */
  withinZone: Partial<Record<ZoneId, number[]>>;
}

export const ORDER_STORAGE_KEY = 'mercadonapp.order.v1';

const MODES: readonly OrderMode[] = ['trip', 'custom', 'az'];

export function defaultOrder(): OrderPreference {
  return { mode: 'trip', zoneOrder: [], withinZone: {} };
}

/** Whether the user has arranged anything — i.e. whether it is *their* order. */
export function isCustomised(order: OrderPreference): boolean {
  return order.zoneOrder.length > 0 || Object.keys(order.withinZone).length > 0;
}

/**
 * Changes the view mode. Deliberately never touches either layer, because
 * switching to `A–Z` to check something and losing your arrangement is the one
 * failure that would make this feature untrustworthy.
 */
export function nextMode(order: OrderPreference, mode: OrderMode): OrderPreference {
  return { ...order, mode };
}

export function resetOrder(): OrderPreference {
  return defaultOrder();
}

/**
 * The zones in effect: a stored order applied over the proposal.
 *
 * `A–Z` does not consult the stored order — the mode is the walk, or it is not.
 * Every zone is always returned: a stored order naming three zones must not drop
 * the other four, and an id that no longer exists must not take a zone with it.
 */
export function orderZones(order: OrderPreference): readonly Zone[] {
  if (order.mode !== 'custom') return ZONES;

  const known = new Set<ZoneId>(ZONES.map((zone) => zone.id));
  const requested = order.zoneOrder.filter((id) => known.has(id));
  const named = new Set(requested);

  return [
    ...requested.flatMap((id) => ZONES.filter((zone) => zone.id === id)),
    ...ZONES.filter((zone) => !named.has(zone.id)),
  ];
}

/**
 * One zone's products, honouring layer 2.
 *
 * Products named in the arrangement come first in that order; anything added
 * later keeps catalogue order after them, so a new product lands somewhere
 * sensible instead of disappearing. Ids the catalogue no longer has are skipped.
 *
 * Only applies while the mode is `custom`: `trip` means the proposal and `A–Z`
 * means by name, and in neither case should an old arrangement reach through.
 */
export function orderWithinZone<T extends CatalogProduct>(
  order: OrderPreference,
  zone: ZoneId,
  products: readonly T[],
): T[] {
  if (order.mode !== 'custom') return [...products];

  const arranged = order.withinZone[zone];
  if (arranged === undefined || arranged.length === 0) return [...products];

  const byId = new Map(products.map((product) => [product.id, product]));
  const named = new Set(arranged);
  const arrangedProducts = arranged.flatMap((id) => {
    const product = byId.get(id);
    return product === undefined ? [] : [product];
  });

  return [...arrangedProducts, ...products.filter((product) => !named.has(product.id))];
}

/** A–Z: the index view, for finding something rather than walking it. */
export function sortByName<T extends CatalogProduct>(products: readonly T[]): T[] {
  return [...products].sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export type MoveDirection = 'up' | 'down';

/**
 * Moves a zone one place, and records the result as `Mi orden`.
 *
 * Every reorder is a single step rather than drag-and-drop, so it is reachable by
 * keyboard and reliable one-handed in a shop.
 *
 * `visible` is the zones actually on screen. Without it, a step swaps with an
 * *empty* zone and the block appears not to move at all — the control is clicked,
 * the mode changes, and nothing happens. So the step is taken against the zones the
 * user can see, and the two swap inside the full list.
 */
export function moveZone(
  order: OrderPreference,
  zone: ZoneId,
  direction: MoveDirection,
  visible?: readonly ZoneId[],
): OrderPreference {
  const ids = orderZones(order).map((entry) => entry.id);
  const shown = (visible ?? ids).filter((id) => ids.includes(id));

  const from = shown.indexOf(zone);
  if (from < 0) return order;

  const to = direction === 'up' ? from - 1 : from + 1;
  if (to < 0 || to >= shown.length) return order;

  const next = [...ids];
  const a = next.indexOf(zone);
  const b = next.indexOf(shown[to]!);
  [next[a], next[b]] = [next[b]!, next[a]!];
  return { ...order, mode: 'custom', zoneOrder: next };
}

/**
 * Moves a product one place inside its zone.
 *
 * Stores the resulting order for the whole zone, so the arrangement is explicit
 * rather than a diff against a catalogue order that may change.
 */
export function moveProduct<T extends CatalogProduct>(
  order: OrderPreference,
  zone: ZoneId,
  productId: number,
  direction: MoveDirection,
  zoneProducts: readonly T[],
): OrderPreference {
  const ids = orderWithinZone(order, zone, zoneProducts).map((product) => product.id);
  const from = ids.indexOf(productId);
  if (from < 0) return order;

  const to = direction === 'up' ? from - 1 : from + 1;
  if (to < 0 || to >= ids.length) return order;

  const next = [...ids];
  [next[from], next[to]] = [next[to]!, next[from]!];
  return { ...order, mode: 'custom', withinZone: { ...order.withinZone, [zone]: next } };
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Reads the stored preference, degrading **field by field**.
 *
 * A corrupt whole value and a single bad field should not be treated the same:
 * a scrambled `zoneOrder` must not discard an arrangement that is perfectly
 * readable in `withinZone`. Nothing here throws — mirroring `loadCart`.
 */
export function loadOrder(storage: StorageLike): OrderPreference {
  try {
    const raw = storage.getItem(ORDER_STORAGE_KEY);
    if (!raw) return defaultOrder();
    const parsed = JSON.parse(raw) as Partial<OrderPreference>;

    const known = new Set<string>(ZONES.map((zone) => zone.id));
    const mode = MODES.includes(parsed.mode as OrderMode) ? (parsed.mode as OrderMode) : 'trip';

    const zoneOrder = Array.isArray(parsed.zoneOrder)
      ? parsed.zoneOrder.filter((id): id is ZoneId => known.has(id as string))
      : [];

    const withinZone: Partial<Record<ZoneId, number[]>> = {};
    if (parsed.withinZone !== null && typeof parsed.withinZone === 'object') {
      for (const [zone, ids] of Object.entries(parsed.withinZone)) {
        if (!known.has(zone)) continue;
        if (!Array.isArray(ids)) continue;
        const numeric = ids.filter((id): id is number => typeof id === 'number');
        if (numeric.length > 0) withinZone[zone as ZoneId] = numeric;
      }
    }

    return { mode, zoneOrder, withinZone };
  } catch {
    return defaultOrder();
  }
}

export function saveOrder(storage: StorageLike, order: OrderPreference): void {
  storage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
}
