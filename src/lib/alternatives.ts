import type { CategoryNode, EnrichedCatalogProduct } from '../types/catalog.ts';
import type { Swap } from '../types/swaps.ts';
import { findSwaps, type SwapSignals } from './swaps.ts';

/**
 * Sections where nutrition advice is meaningless (cleaning, cosmetics, pets,
 * pharmacy). Offering "healthier alternatives" for shampoo is noise, so the
 * alternatives panel is omitted entirely for these.
 */
const NON_FOOD_SECTIONS: ReadonlySet<string> = new Set([
  'Limpieza y hogar',
  'Cuidado facial y corporal',
  'Cuidado del cabello',
  'Maquillaje',
  'Bebé',
  'Mascotas',
  'Fitoterapia y parafarmacia',
]);

/**
 * Shelves inside an otherwise non-food section that ARE food. "Bebé" holds
 * both nappies and baby food, and baby food is exactly the kind of product
 * where a better alternative is worth suggesting — so the exception list
 * matters more than the section rule.
 */
const FOOD_SHELVES_INSIDE_NON_FOOD: ReadonlySet<string> = new Set([
  'Alimentación infantil',
  'Leche y bebidas vegetales',
]);

/**
 * Whether nutrition advice applies to this product. Errs toward `true`: an
 * unrecognised section keeps the panel, because silently hiding it is worse
 * than showing a panel that ends up saying "no data".
 */
export function isFoodProduct(categoryPath: readonly CategoryNode[]): boolean {
  const section = categoryPath[0]?.name;
  if (section === undefined) return true;
  if (!NON_FOOD_SECTIONS.has(section)) return true;
  const shelf = categoryPath[1]?.name;
  return shelf !== undefined && FOOD_SHELVES_INSIDE_NON_FOOD.has(shelf);
}

/** Whether any comparison dimension has data on both sides to be meaningful. */
export function hasComparableData(signals: SwapSignals): boolean {
  return (
    signals.additiveCount !== null ||
    signals.novaGroup !== null ||
    signals.protein !== null ||
    signals.sugars !== null ||
    signals.salt !== null
  );
}

export type AlternativesOutcome =
  | { kind: 'non-food' }
  | { kind: 'no-data' }
  | { kind: 'none-better'; comparedCount: number };

/**
 * Explains an empty alternatives result. "No alternatives" is not one state but
 * three, and the user deserves to know which: this is not a nutrition product,
 * we have no data to compare, or we compared it and nothing was better.
 */
export function explainAlternatives(
  categoryPath: readonly CategoryNode[],
  signals: SwapSignals,
  comparedCount: number,
): AlternativesOutcome {
  if (!isFoodProduct(categoryPath)) return { kind: 'non-food' };
  if (!hasComparableData(signals)) return { kind: 'no-data' };
  return { kind: 'none-better', comparedCount };
}

export type AlternativesResult =
  | { kind: 'available'; swaps: Swap[] }
  | AlternativesOutcome;

/**
 * The single source of truth for the alternatives panel. Returning one union
 * instead of a `swaps` + `outcome` pair makes impossible states unrepresentable
 * — there is no way to hand the UI swaps for a product we decided not to advise on.
 */
export function evaluateAlternatives(
  product: EnrichedCatalogProduct,
  catalog: readonly EnrichedCatalogProduct[],
  signals: ReadonlyMap<number, SwapSignals>,
  limit = 3,
): AlternativesResult {
  const own = signals.get(product.id);
  const peers = catalog.filter(
    (candidate) => candidate.id !== product.id && candidate.leafCategoryId === product.leafCategoryId,
  );

  if (!isFoodProduct(product.categoryPath)) return { kind: 'non-food' };
  if (!own || !hasComparableData(own)) return { kind: 'no-data' };

  const swaps = findSwaps(product, catalog, signals, limit);
  if (swaps.length > 0) return { kind: 'available', swaps };
  return { kind: 'none-better', comparedCount: peers.length };
}
