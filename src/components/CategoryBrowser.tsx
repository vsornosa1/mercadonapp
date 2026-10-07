import type { CategorySection } from '../lib/category-tree.ts';
import { pluralise } from '../lib/plural.ts';

export function SectionGrid({
  sections,
  onSelect,
}: {
  sections: CategorySection[];
  onSelect: (id: number) => void;
}) {
  if (sections.length === 0) {
    return (
      <div className="state" role="status">
        <p className="state__hint">No hay categorías disponibles.</p>
      </div>
    );
  }

  return (
    <ul className="section-grid" role="list">
      {sections.map((section) => (
        <li key={section.id}>
          <button type="button" className="section-card" onClick={() => onSelect(section.id)}>
            <span className="section-card__name">{section.name}</span>
            <span className="section-card__count">{pluralise(section.count, 'producto', 'productos')}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function ShelfList({
  section,
  onSelect,
}: {
  section: CategorySection;
  onSelect: (id: number) => void;
}) {
  return (
    <ul className="shelf-list" role="list">
      {section.shelves.map((shelf) => (
        <li key={shelf.id}>
          <button type="button" className="shelf-row" onClick={() => onSelect(shelf.id)}>
            <span className="shelf-row__name">{shelf.name}</span>
            <span className="shelf-row__count">{pluralise(shelf.count, 'producto', 'productos')}</span>
            <span className="shelf-row__chevron" aria-hidden="true">
              ›
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export interface Crumb {
  label: string;
  onClick?: () => void;
}

/**
 * The section list as a column beside the content, for a window with room.
 *
 * A phone drills: sections, then shelves, then products, one screen at a time.
 * A window can hold the sections and the shelves at once, so it shows both and
 * the section list stops being a step you have to take.
 */
export function SectionRail({
  sections,
  selectedId,
  onSelect,
}: {
  sections: CategorySection[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <nav className="section-rail" aria-label="Secciones del supermercado">
      <ul className="section-rail__list" role="list">
        {sections.map((section) => (
          <li key={section.id}>
            <button
              type="button"
              className="section-rail__item"
              aria-current={section.id === selectedId ? 'true' : undefined}
              onClick={() => onSelect(section.id)}
            >
              <span className="section-rail__name">{section.name}</span>
              <span className="section-rail__count">{section.count}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Shows where the user is in the drill-down, and lets them step back up. */
export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="breadcrumb" aria-label="Ruta de navegación">
      <ol className="breadcrumb__list">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="breadcrumb__item">
              {crumb.onClick && !isLast ? (
                <button type="button" className="breadcrumb__link" onClick={crumb.onClick}>
                  {crumb.label}
                </button>
              ) : (
                <span className="breadcrumb__current" aria-current={isLast ? 'page' : undefined}>
                  {crumb.label}
                </span>
              )}
              {!isLast ? (
                <span className="breadcrumb__sep" aria-hidden="true">
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
