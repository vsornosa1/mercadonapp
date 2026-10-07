import { describe, expect, it } from 'vitest';

import { pageWindow, paginate } from './pagination.ts';
const items = Array.from({ length: 45 }, (_, i) => i + 1); // 1..45

describe('paginate', () => {
  it('splits items into the requested page', () => {
    const page = paginate(items, 2, 20);
    expect(page.items).toHaveLength(20);
    expect(page.items[0]).toBe(21);
    expect(page.items[19]).toBe(40);
  });

  it('returns a short final page', () => {
    const page = paginate(items, 3, 20);
    expect(page.items).toHaveLength(5);
    expect(page.items).toEqual([41, 42, 43, 44, 45]);
  });

  it('reports the page count and navigation flags', () => {
    expect(paginate(items, 1, 20)).toMatchObject({ pageCount: 3, total: 45, hasPrev: false, hasNext: true });
    expect(paginate(items, 2, 20)).toMatchObject({ hasPrev: true, hasNext: true });
    expect(paginate(items, 3, 20)).toMatchObject({ hasPrev: true, hasNext: false });
  });

  it('clamps a page number below 1', () => {
    expect(paginate(items, 0, 20).page).toBe(1);
    expect(paginate(items, -5, 20).page).toBe(1);
  });

  it('clamps a page number beyond the last page, so a stale page cannot render empty', () => {
    const page = paginate(items, 99, 20);
    expect(page.page).toBe(3);
    expect(page.items).toHaveLength(5);
  });

  it('handles an empty list as a single empty page rather than zero pages', () => {
    expect(paginate([], 1, 20)).toEqual({
      items: [],
      page: 1,
      pageCount: 1,
      total: 0,
      hasPrev: false,
      hasNext: false,
    });
  });

  it('handles a page size larger than the list', () => {
    expect(paginate(items, 1, 100)).toMatchObject({ pageCount: 1, items: items });
  });

  it('rejects a non-positive page size instead of looping forever', () => {
    expect(() => paginate(items, 1, 0)).toThrow();
    expect(() => paginate(items, 1, -3)).toThrow();
  });
});

describe('pageWindow', () => {
  it('lists every page when they fit', () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('always includes the first and last page when collapsed', () => {
    const slots = pageWindow(10, 40);
    expect(slots[0]).toBe(1);
    expect(slots[slots.length - 1]).toBe(40);
  });

  it('keeps the current page and its neighbours visible', () => {
    expect(pageWindow(10, 40)).toEqual([1, 'gap', 9, 10, 11, 'gap', 40]);
  });

  it('does not emit a gap for a single skipped page', () => {
    // page 3 of 10: from=2, so [1,2,3,4,'gap',10] — no gap after 1
    expect(pageWindow(3, 10)).toEqual([1, 2, 3, 4, 'gap', 10]);
  });

  it('handles the first and last page without leading or trailing gaps', () => {
    expect(pageWindow(1, 10)).toEqual([1, 2, 'gap', 10]);
    expect(pageWindow(10, 10)).toEqual([1, 'gap', 9, 10]);
  });

  it('handles a single page', () => {
    expect(pageWindow(1, 1)).toEqual([1]);
  });
});
