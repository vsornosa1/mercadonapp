import type { CatalogProduct } from '../types/catalog.ts';

/**
 * Products from the same part of the shop as this one.
 *
 * This is deliberately not a nutrition judgement: it answers "what else is
 * here?" rather than "can I do better?". That is why it also runs for non-food
 * — where the alternatives panel is withheld because health advice would be
 * noise — and why it is the only help available for a product we compared and
 * found nothing better for.
 */

const SHELF_LEVEL = 1;

/**
 * How close a candidate sits to the product, or `null` for a different part of
 * the shop. 0 is the same category, 1 the same shelf.
 *
 * The shelf is compared as the (section, shelf) pair the catalogue actually
 * uses: a shelf is cross-listed under more than one section, so its id alone
 * would put, say, baby formula next to nappies.
 */
function closenessTier(
  product: CatalogProduct,
  candidate: CatalogProduct,
): number | null {
  if (candidate.leafCategoryId === product.leafCategoryId) return 0;

  const own = product.categoryPath;
  const other = candidate.categoryPath;
  if (own[SHELF_LEVEL] === undefined) return null;
  if (own[0]?.id !== other[0]?.id) return null;
  if (own[SHELF_LEVEL].id !== other[SHELF_LEVEL]?.id) return null;
  return 1;
}

/** Price gap as a share of the dearer one, so 2 € vs 3 € outranks 2 € vs 20 €. */
function priceGap(a: number, b: number): number {
  const dearest = Math.max(a, b);
  if (dearest <= 0) return 0;
  return Math.abs(a - b) / dearest;
}

/**
 * The closest neighbours first, capped at `limit`. `excludeIds` keeps products
 * already offered as better alternatives out, so the two panels never repeat
 * one another. Order is total and stable — same inputs, same list.
 */
export function findSimilar<T extends CatalogProduct>(
  product: CatalogProduct,
  catalog: readonly T[],
  excludeIds: ReadonlySet<number> = new Set(),
  limit = 6,
): T[] {
  const scored: { candidate: T; tier: number; gap: number }[] = [];

  for (const candidate of catalog) {
    if (candidate.id === product.id || excludeIds.has(candidate.id)) continue;
    const tier = closenessTier(product, candidate);
    if (tier === null) continue;
    scored.push({
      candidate,
      tier,
      gap: priceGap(product.unitPrice, candidate.unitPrice),
    });
  }

  scored.sort(
    (a, b) =>
      a.tier - b.tier ||
      a.gap - b.gap ||
      a.candidate.name.localeCompare(b.candidate.name, 'es') ||
      a.candidate.id - b.candidate.id,
  );

  return scored.slice(0, limit).map((entry) => entry.candidate);
}
