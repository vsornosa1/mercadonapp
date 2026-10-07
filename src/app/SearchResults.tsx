import { useMemo } from 'react';

import { ProductResults } from '../components/ProductResults.tsx';
import { StateMessage } from '../components/StateMessage.tsx';
import { pluralise } from '../lib/plural.ts';
import { search } from '../lib/search.ts';
import type { EnrichedCatalogProduct } from '../types/catalog.ts';
import type { CatalogStatus } from './useCatalog.ts';

interface SearchResultsProps {
  query: string;
  products: EnrichedCatalogProduct[];
  status: CatalogStatus;
  onSelectProduct: (id: number) => void;
}

/**
 * What a search in progress looks like.
 *
 * The field itself lives in the app bar, so this is only ever the answer to it —
 * which is why there is no "type something" state here: an empty field simply
 * leaves the user on the section they were already reading.
 */
export function SearchResults({ query, products, status, onSelectProduct }: SearchResultsProps) {
  const term = query.trim();

  const results = useMemo(
    () => (term === '' ? [] : search(query, products)),
    [term, query, products],
  );

  if (status === 'loading') return <SearchSkeleton />;

  if (status === 'error') {
    return (
      <StateMessage
        tone="alert"
        icon="alert"
        title="No se pudo cargar el catálogo"
        hint="Comprueba la conexión y vuelve a intentarlo."
      />
    );
  }

  if (results.length === 0) {
    return (
      <StateMessage
        title="Sin resultados"
        hint={`No encontramos nada para «${term}». Prueba con otro término, sin acentos.`}
      />
    );
  }

  return (
    <section aria-label="Búsqueda">
      <ProductResults
        key={term}
        heading={`${pluralise(results.length, 'resultado', 'resultados')} para «${term}»`}
        products={results}
        onSelectProduct={onSelectProduct}
      />
    </section>
  );
}

function SearchSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando catálogo">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="skeleton__row">
          <div className="skeleton skeleton__thumb" />
          <div className="skeleton skeleton__line" />
        </div>
      ))}
    </div>
  );
}
