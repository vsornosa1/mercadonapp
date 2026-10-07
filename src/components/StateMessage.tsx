import type { ReactElement } from 'react';

interface StateMessageProps {
  /** `alert` for failures, default `status` for informational states. */
  tone?: 'status' | 'alert';
  icon?: 'search' | 'alert' | 'empty' | 'cart';
  title: string;
  hint?: string;
}

const ICON_PATHS: Record<NonNullable<StateMessageProps['icon']>, ReactElement> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="13" />
      <line x1="12" y1="16.5" x2="12" y2="16.5" />
    </>
  ),
  empty: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="7" y1="9" x2="17" y2="9" />
      <line x1="7" y1="13" x2="13" y2="13" />
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

/**
 * A non-empty state that explains itself: an icon for shape, a heading for the
 * situation, and a hint for what to do next. Previously these were bare
 * sentences, which read as an unfinished screen.
 */
export function StateMessage({ tone = 'status', icon = 'empty', title, hint }: StateMessageProps) {
  return (
    <div className="state" role={tone}>
      <svg
        className="state__icon"
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {ICON_PATHS[icon]}
      </svg>
      <h2 className="state__title">{title}</h2>
      {hint ? <p className="state__hint">{hint}</p> : null}
    </div>
  );
}
