import type { CategorySection } from '../lib/category-tree.ts';

function countLabel(count: number): string {
  return count === 1 ? '1 producto' : `${count} productos`;
}

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
            <span className="section-card__count">{countLabel(section.count)}</span>
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
            <span className="shelf-row__count">{countLabel(shelf.count)}</span>
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
