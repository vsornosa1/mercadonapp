import { cartTabName, NavIcon, NAV_TABS, tabLabel, type TabId } from './nav-tabs.tsx';

interface BottomNavProps {
  active: TabId;
  cartCount: number;
  cartTotal: number;
  onSelect: (tab: TabId) => void;
}

/**
 * The phone navigation: persistent tabs under the thumb, so "where am I" does
 * not depend on remembering which button you pressed.
 *
 * The same tabs are a bar across the top of a desktop window (see AppHeader);
 * this one is not shown there, because a fixed bottom bar belongs to a device
 * you hold.
 */
export function BottomNav({ active, cartCount, cartTotal, onSelect }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Secciones">
      {NAV_TABS.map((tab) => {
        const withCount = tab === 'cart' && cartCount > 0;
        return (
          <button
            key={tab}
            type="button"
            className="bottom-nav__tab"
            aria-current={tab === active ? 'page' : undefined}
            aria-label={withCount ? cartTabName(cartCount, cartTotal) : tabLabel(tab)}
            onClick={() => onSelect(tab)}
          >
            <NavIcon tab={tab} />
            <span aria-hidden={withCount ? 'true' : undefined}>{tabLabel(tab)}</span>
            {withCount ? (
              <span className="bottom-nav__badge" aria-hidden="true">
                {cartCount}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
