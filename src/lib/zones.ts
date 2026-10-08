import type { CatalogProduct, EnrichedCatalogProduct } from '../types/catalog.ts';
import { isFoodProduct } from './alternatives.ts';

/**
 * Seven walkable zones.
 *
 * A zone is a *coarse* grouping: "this belongs to the same part of the trip",
 * never "this is on aisle 7". Mercadona publishes no planogram and layouts differ
 * between store formats, so an aisle-level answer would be invented. A coarse
 * grouping cannot be wrong in a costly way — a wrong aisle sends you to the wrong
 * aisle.
 */
export type ZoneId =
  | 'frescos'
  | 'mostrador'
  | 'despensa'
  | 'bebidas'
  | 'no-alimentacion'
  | 'refrigerados'
  | 'congelados';

export interface Zone {
  id: ZoneId;
  label: string;
  /** One line explaining its place in the sequence, shown to the user. */
  why: string;
}

/**
 * The zones in proposed trip order.
 *
 * Two principles disagreed about non-food: hygiene wants it last, physics wants
 * the cold chain last. **Physics wins** — melting is irreversible, while packaging
 * already separates cleaning products from food — so `no-alimentacion` is its own
 * block *before* the cold chain and every trip ends at the freezer.
 */
export const ZONES: readonly Zone[] = [
  { id: 'frescos', label: 'Frescos', why: 'Lo primero, y lo que menos sufre en el carro.' },
  {
    id: 'mostrador',
    label: 'Carnicería y pescadería',
    why: 'Los mostradores están juntos a la entrada.',
  },
  { id: 'despensa', label: 'Despensa', why: 'Lo seco y estable, entre lo fresco y el frío.' },
  { id: 'bebidas', label: 'Bebidas', why: 'Pesan: pronto y abajo, antes del frío.' },
  {
    id: 'no-alimentacion',
    label: 'No alimentación',
    why: 'Aparte de la comida, nunca mezclada, y antes del frío.',
  },
  { id: 'refrigerados', label: 'Refrigerados', why: 'El frío, lo más tarde posible.' },
  { id: 'congelados', label: 'Congelados', why: 'Al final para que no se derritan.' },
];

/**
 * The section → zone table. Data, not a branch, so moving a section is a
 * one-line diff in one place.
 */
const SECTION_TO_ZONE: Record<string, ZoneId> = {
  'Fruta y verdura': 'frescos',
  Carne: 'mostrador',
  'Marisco y pescado': 'mostrador',
  'Charcutería y quesos': 'mostrador',
  'Panadería y pastelería': 'mostrador',
  'Aceite, especias y salsas': 'despensa',
  'Conservas, caldos y cremas': 'despensa',
  'Arroz, legumbres y pasta': 'despensa',
  'Cacao, café e infusiones': 'despensa',
  'Cereales y galletas': 'despensa',
  'Azúcar, caramelos y chocolate': 'despensa',
  Aperitivos: 'despensa',
  'Agua y refrescos': 'bebidas',
  Zumos: 'bebidas',
  Bodega: 'bebidas',
  'Limpieza y hogar': 'no-alimentacion',
  'Cuidado facial y corporal': 'no-alimentacion',
  'Cuidado del cabello': 'no-alimentacion',
  Maquillaje: 'no-alimentacion',
  Mascotas: 'no-alimentacion',
  'Fitoterapia y parafarmacia': 'no-alimentacion',
  'Huevos, leche y mantequilla': 'refrigerados',
  'Postres y yogures': 'refrigerados',
  'Pizzas y platos preparados': 'refrigerados',
  Congelados: 'congelados',
  // Bebé is the one section that spans two zones. This is its default; the
  // per-product split in `zoneFor` overrides it for the shelves that hold food.
  // Listing it keeps "every section in the catalogue is mapped" a plain check.
  Bebé: 'despensa',
};

/**
 * Where a section the table has never seen lands.
 *
 * Exported so the fallback is visible in a test rather than silent: a future
 * Mercadona category must show up as "unmapped", not disappear from the app.
 * `despensa` is the largest zone, so a misfiled product is least conspicuous there.
 */
export const FALLBACK_ZONE: ZoneId = 'despensa';

export function isMappedSection(sectionName: string): boolean {
  return sectionName in SECTION_TO_ZONE;
}

/**
 * The zone a product belongs to.
 *
 * Takes the *catalogue* product, not the enriched one: a zone depends only on where
 * a product sits in the shop, so nothing here needs nutrition data.
 *
 * `Bebé` holds both formula and nappies, so the split is resolved per product
 * through the existing `isFoodProduct` — the exception list keeps its single home.
 */
export function zoneFor(product: CatalogProduct): ZoneId {
  const section = product.categoryPath[0]?.name;
  if (section === undefined) return FALLBACK_ZONE;

  if (section === 'Bebé') return isFoodProduct(product.categoryPath) ? 'despensa' : 'no-alimentacion';

  return SECTION_TO_ZONE[section] ?? FALLBACK_ZONE;
}

export interface ZoneGroup {
  zone: Zone;
  products: EnrichedCatalogProduct[];
}

/** Groups products into their zones, in trip order, omitting empty zones. */
export function groupByZone(products: readonly EnrichedCatalogProduct[]): ZoneGroup[] {
  const byZone = new Map<ZoneId, EnrichedCatalogProduct[]>();
  for (const product of products) {
    const id = zoneFor(product);
    const bucket = byZone.get(id);
    if (bucket) bucket.push(product);
    else byZone.set(id, [product]);
  }

  // Iterating ZONES rather than the map is what makes the order the proposal's
  // rather than the order the products happened to arrive in.
  return ZONES.flatMap((zone) => {
    const group = byZone.get(zone.id);
    return group === undefined ? [] : [{ zone, products: group }];
  });
}
