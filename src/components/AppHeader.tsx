import { useIsDesktop } from '../app/useMediaQuery.ts';
import { formatPrice } from '../lib/format.ts';
import { Icon } from './icons.tsx';
import { navTabAttributes, NAV_TABS, tabIcon, tabLabel, type TabId } from './nav-tabs.tsx';
import { SearchBar } from './SearchBar.tsx';

interface AppHeaderProps {
  query: string;
  onQueryChange: (value: string) => void;
  /** `null` while a product is open, so no section claims to be current. */
  activeTab: TabId | null;
  onSelectTab: (tab: TabId) => void;
  cartCount: number;
  cartTotal: number;
  /**
   * Whether the bar must carry the list itself.
   *
   * The invariant is exactly one persistent way to reach the list: the tabs when
   * they are on screen, this when they are not. A phone hides its tabs for a
   * product — a pushed view with its own way back — but the list is the reason
   * the app is open in the shop, so it cannot become a dead end.
   */
  listButton?: boolean;
}

/**
 * The app bar, and the one control that is never missing: search.
 *
 * The arrangement is deliberate per device rather than stretched. A phone gets
 * two rows — the name, then a full-width field you can hit with a thumb. A
 * window on a desktop gets one row: name, field, and the sections across the
 * bar with what the list costs, because there is no bottom bar there to hold
 * them.
 */
export function AppHeader({
  query,
  onQueryChange,
  activeTab,
  onSelectTab,
  cartCount,
  cartTotal,
  listButton = false,
}: AppHeaderProps) {
  const isDesktop = useIsDesktop();
  const listAttributes = navTabAttributes('cart', false, cartCount, cartTotal);

  return (
    <header className="app-header">
      {/* A brand mark, not a heading: each view owns the one h1 on the page. */}
      <p className="app-header__title">Mercadonapp</p>

      {listButton ? (
        <button
          type="button"
          className="app-header__list"
          aria-label={listAttributes['aria-label']}
          onClick={() => onSelectTab('cart')}
        >
          <Icon name="cart" size={18} />
          <span aria-hidden={listAttributes.labelled ? undefined : 'true'}>
            {tabLabel('cart')}
          </span>
          {cartCount === 0 ? null : (
            <span className="bar-pill" aria-hidden="true">
              {cartCount}
            </span>
          )}
        </button>
      ) : null}

      <SearchBar value={query} onChange={onQueryChange} />

      {isDesktop ? (
        <nav className="top-nav" aria-label="Secciones">
          {NAV_TABS.map((tab) => {
            const { labelled, ...attributes } = navTabAttributes(
              tab,
              tab === activeTab,
              cartCount,
              cartTotal,
            );
            const showTotal = tab === 'cart' && cartCount > 0;

            return (
              <button
                key={tab}
                type="button"
                className="top-nav__tab"
                {...attributes}
                onClick={() => onSelectTab(tab)}
              >
                <Icon name={tabIcon(tab)} size={18} />
                <span aria-hidden={labelled ? undefined : 'true'}>{tabLabel(tab)}</span>
                {showTotal ? (
                  <span className="bar-pill" aria-hidden="true">
                    {formatPrice(cartTotal)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
}
