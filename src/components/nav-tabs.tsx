import type { ReactElement } from 'react';

import { formatPrice } from '../lib/format.ts';
import { pluralise } from '../lib/plural.ts';

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

export const NAV_TABS: readonly TabId[] = ['browse', 'cart'];

const ICONS: Record<TabId, ReactElement> = {
  browse: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  cart: (
    <>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </>
  ),
};

export function tabLabel(tab: TabId): string {
  return LABELS[tab];
}

export function NavIcon({ tab, size = 22 }: { tab: TabId; size?: number }) {
  return (
    <svg
      className="nav-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[tab]}
    </svg>
  );
}

/**
 * The list tab's accessible name. Both navigations use it, so the count and the
 * total reach a screen reader instead of living only in a badge.
 */
export function cartTabName(count: number, total: number): string {
  if (count === 0) return LABELS.cart;
  return `${LABELS.cart}, ${pluralise(count, 'producto', 'productos')}, ${formatPrice(total)}`;
}
