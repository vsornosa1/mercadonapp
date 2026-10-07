import { vi } from 'vitest';

import { DESKTOP_QUERY } from './app/useMediaQuery.ts';

/**
 * Choose the composition a test renders in.
 *
 * jsdom has no `matchMedia`, so without this every suite would silently exercise
 * the phone layout. Saying which layout a test is about makes the assertion mean
 * what it says.
 */
export function stubViewport(composition: 'phone' | 'desktop'): void {
  const desktop = composition === 'desktop';
  vi.stubGlobal('matchMedia', (query: string) => {
    const list = {
      matches: desktop && query === DESKTOP_QUERY,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    };
    return list as unknown as MediaQueryList;
  });
}
