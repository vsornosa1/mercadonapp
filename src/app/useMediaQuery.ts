import { useEffect, useState } from 'react';

/**
 * Whether the viewport currently matches a media query.
 *
 * The desktop and phone compositions are different arrangements, not one
 * arrangement with different CSS, so the choice has to be readable from
 * JavaScript. Hiding one behind `display: none` would leave the hidden variant
 * in the accessibility tree and duplicate every control.
 *
 * Environments without `matchMedia` (jsdom, and any non-browser render) report
 * `false` — the phone composition — so nothing throws and tests opt in to a
 * layout explicitly instead of depending on the ambient environment.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => queryMedia(query));

  useEffect(() => {
    const list = mediaQueryList(query);
    if (list === null) return;

    const update = () => setMatches(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);

  return matches;
}

function mediaQueryList(query: string): MediaQueryList | null {
  if (typeof window === 'undefined') return null;
  if (typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(query);
}

function queryMedia(query: string): boolean {
  return mediaQueryList(query)?.matches ?? false;
}

/**
 * The width at which the layout stops being a phone: an app bar with the search
 * and the sections beside the content, rather than tabs under a thumb.
 */
export const DESKTOP_QUERY = '(min-width: 48rem)';

/** Whether to compose for a pointer-and-window device instead of a phone. */
export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_QUERY);
}
