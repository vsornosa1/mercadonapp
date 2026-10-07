export interface Page<T> {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
}

/**
 * Slices a list into a page, clamping the requested page into range. Clamping
 * matters more than it looks: a stale page number (after a filter narrows the
 * results) must not render an empty screen.
 */
export function paginate<T>(items: readonly T[], page: number, pageSize: number): Page<T> {
  if (!Number.isFinite(pageSize) || pageSize < 1) {
    throw new Error(`pageSize debe ser >= 1 (recibido: ${pageSize})`);
  }

  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const requested = Number.isFinite(page) ? Math.floor(page) : 1;
  const safePage = Math.min(Math.max(1, requested), pageCount);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageCount,
    total,
    hasPrev: safePage > 1,
    hasNext: safePage < pageCount,
  };
}

export type PageSlot = number | 'gap';

/**
 * The page numbers to render, with gaps when there are many pages. Always
 * includes the first and last page so the user can jump to the ends.
 */
export function pageWindow(page: number, pageCount: number, maxSlots = 7): PageSlot[] {
  if (pageCount <= maxSlots) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const slots: PageSlot[] = [1];
  const span = 1;
  const from = Math.max(2, page - span);
  const to = Math.min(pageCount - 1, page + span);

  if (from > 2) slots.push('gap');
  for (let p = from; p <= to; p += 1) slots.push(p);
  if (to < pageCount - 1) slots.push('gap');
  slots.push(pageCount);

  return slots;
}
