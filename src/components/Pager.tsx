import { pageWindow } from '../lib/pagination.ts';

interface PagerProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

export function Pager({ page, pageCount, onPageChange }: PagerProps) {
  if (pageCount <= 1) return null;

  return (
    <nav className="pager" aria-label="Paginación">
      <button
        type="button"
        className="pager__arrow"
        aria-label="Página anterior"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        ←
      </button>

      <ul className="pager__pages" role="list">
        {pageWindow(page, pageCount).map((slot, index) =>
          slot === 'gap' ? (
            <li key={`gap-${index}`} className="pager__gap" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={slot}>
              <button
                type="button"
                className="pager__page"
                aria-label={`Página ${slot}`}
                aria-current={slot === page ? 'page' : undefined}
                onClick={() => onPageChange(slot)}
              >
                {slot}
              </button>
            </li>
          ),
        )}
      </ul>

      <button
        type="button"
        className="pager__arrow"
        aria-label="Página siguiente"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        →
      </button>

      <p className="pager__status" role="status">
        Página {page} de {pageCount}
      </p>
    </nav>
  );
}
