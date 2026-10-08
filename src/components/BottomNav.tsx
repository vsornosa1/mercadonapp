import { Icon } from './icons.tsx';
import { navTabAttributes, NAV_TABS, tabIcon, tabLabel, type TabId } from './nav-tabs.tsx';

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
        const { labelled, ...attributes } = navTabAttributes(
          tab,
          tab === active,
          cartCount,
          cartTotal,
        );
        const badge = tab === 'cart' && cartCount > 0 ? cartCount : null;

        return (
          <button
            key={tab}
            type="button"
            className="bottom-nav__tab"
            {...attributes}
            onClick={() => onSelect(tab)}
          >
            <Icon name={tabIcon(tab)} className="nav-icon" />
            <span aria-hidden={labelled ? undefined : 'true'}>{tabLabel(tab)}</span>
            {badge === null ? null : (
              <span className="bottom-nav__badge" aria-hidden="true">
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
