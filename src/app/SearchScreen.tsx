import { useMemo, useState } from 'react';

import { ProductRow } from '../components/ProductRow.tsx';
import { SearchBar } from '../components/SearchBar.tsx';
import { search } from '../lib/search.ts';
import type { EnrichedCatalogProduct } from '../types/catalog.ts';
import type { CatalogStatus } from './useCatalog.ts';

interface SearchScreenProps {
  products: EnrichedCatalogProduct[];
  status: CatalogStatus;
  onSelectProduct: (id: number) => void;
}

export function SearchScreen({ products, status, onSelectProduct }: SearchScreenProps) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => search(query, products), [query, products]);

  const topLevelCategories = useMemo(() => {
    const names = new Set<string>();
    for (const product of products) {
      const topLevel = product.categoryPath[product.categoryPath.length - 2]?.name;
      if (topLevel) names.add(topLevel);
    }
    return [...names].sort((a, b) => a.localeCompare(b, 'es'));
  }, [products]);

  return (
    <section aria-label="Búsqueda de productos">
      <SearchBar value={query} onChange={setQuery} />

      {status === 'loading' ? <SearchSkeleton /> : null}
      {status === 'error' ? <ErrorState /> : null}
      {status === 'ready' && query.trim() === '' ? (
        <CategoryBrowse categories={topLevelCategories} onSelect={setQuery} />
      ) : null}
      {status === 'ready' && query.trim() !== '' && results.length === 0 ? (
        <NoResultsState />
      ) : null}
      {status === 'ready' && results.length > 0 ? (
        <ul className="product-list" role="list" aria-label="Resultados">
          {results.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              onSelect={() => onSelectProduct(product.id)}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function CategoryBrowse({
  categories,
  onSelect,
}: {
  categories: string[];
  onSelect: (name: string) => void;
}) {
  return (
    <div>
      <h2 className="category-heading">Categorías</h2>
      <ul className="category-list" role="list">
        {categories.map((category) => (
          <li key={category}>
            <button type="button" className="category-chip" onClick={() => onSelect(category)}>
              {category}
            </button>
          </li>
        ))}
      </ul>
    </div>
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

function ErrorState() {
  return (
    <div className="state" role="alert">
      <h2 className="state__title">No se pudo cargar el catálogo</h2>
      <p className="state__hint">Comprueba la conexión y vuelve a intentarlo.</p>
    </div>
  );
}

function NoResultsState() {
  return (
    <div className="state" role="status">
      <h2 className="state__title">Sin resultados</h2>
      <p className="state__hint">Prueba con otro término, sin acentos.</p>
    </div>
  );
}
