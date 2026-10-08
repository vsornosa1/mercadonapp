import { formatPrice } from '../lib/format.ts';
import { pluralise } from '../lib/plural.ts';
import type { IconName } from './icons.tsx';

/**
 * Where the user can go.
 *
 * Search is deliberately not one of these. The field is on screen at every
 * moment, so a tab that navigates to a second copy of it is a stop with nothing
 * to do — typing is a mode, not a destination.
 */
export type TabId = 'browse' | 'cart';

const LABELS: Record<TabId, string> = {
  browse: 'Categorías',
  cart: 'Lista',
};

const ICONS: Record<TabId, IconName> = {
  browse: 'browse',
  cart: 'cart',
};

export const NAV_TABS: readonly TabId[] = ['browse', 'cart'];

export function tabLabel(tab: TabId): string {
  return LABELS[tab];
}

export function tabIcon(tab: TabId): IconName {
  return ICONS[tab];
}

/**
 * The list tab's accessible name. Both navigations use it, so the count and the
 * total reach a screen reader instead of living only in a badge.
 */
export function cartTabName(count: number, total: number): string {
  if (count === 0) return LABELS.cart;
  return `${LABELS.cart}, ${pluralise(count, 'producto', 'productos')}, ${formatPrice(total)}`;
}

/**
 * The attributes every tab button needs, derived once.
 *
 * This is the part that can silently drift: the list tab has to state how many
 * items and what they cost, or the number is a visual ornament that only sighted
 * users get. Two navigations render these tabs, so the rule lives here rather
 * than being restated in each.
 */
export function navTabAttributes(
  tab: TabId,
  current: boolean,
  cartCount: number,
  cartTotal: number,
): { 'aria-current'?: 'page'; 'aria-label': string; labelled: boolean } {
  const showedCount = tab === 'cart' && cartCount > 0;
  return {
    'aria-current': current ? 'page' : undefined,
    'aria-label': showedCount ? cartTabName(cartCount, cartTotal) : tabLabel(tab),
    // When the count is in the accessible name, the visible label must not repeat
    // it as well, or the tab announces itself twice.
    labelled: !showedCount,
  };
}
