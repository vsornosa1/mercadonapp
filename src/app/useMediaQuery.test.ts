import { renderHook, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useMediaQuery } from './useMediaQuery.ts';

/** A minimal MediaQueryList, since jsdom does not implement matchMedia. */
function stubMatchMedia(initial: boolean) {
  const listeners = new Set<() => void>();
  const queries: string[] = [];
  const mql = {
    matches: initial,
    media: '',
    addEventListener: (_event: string, listener: () => void) => void listeners.add(listener),
    removeEventListener: (_event: string, listener: () => void) => void listeners.delete(listener),
  };
  vi.stubGlobal('matchMedia', (query: string) => {
    queries.push(query);
    return mql;
  });
  return {
    queries,
    listenerCount: () => listeners.size,
    flip(next: boolean) {
      mql.matches = next;
      listeners.forEach((listener) => listener());
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useMediaQuery', () => {
  it('reports the current match', () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(min-width: 48rem)'));
    expect(result.current).toBe(true);
  });

  it('asks about the query it was given', () => {
    const media = stubMatchMedia(false);
    renderHook(() => useMediaQuery('(min-width: 48rem)'));
    expect(media.queries).toContain('(min-width: 48rem)');
  });

  it('follows a change', () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(min-width: 48rem)'));
    act(() => media.flip(true));
    expect(result.current).toBe(true);
  });

  it('unsubscribes on unmount', () => {
    const media = stubMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 48rem)'));
    unmount();
    expect(media.listenerCount()).toBe(0);
  });

  it('is false when the environment has no matchMedia, rather than throwing', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderHook(() => useMediaQuery('(min-width: 48rem)'));
    expect(result.current).toBe(false);
  });
});
