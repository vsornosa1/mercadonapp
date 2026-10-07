import { useMemo, useState } from 'react';

import { Breadcrumb, SectionGrid, ShelfList } from '../components/CategoryBrowser.tsx';
import { Pager } from '../components/Pager.tsx';
import { ProductRow } from '../components/ProductRow.tsx';
import { SearchBar } from '../components/SearchBar.tsx';
import { buildCategoryTree } from '../lib/category-tree.ts';
import { paginate } from '../lib/pagination.ts';
import { search } from '../lib/search.ts';
import type { EnrichedCatalogProduct } from '../types/catalog.ts';
import type { CatalogStatus } from './useCatalog.ts';

const PAGE_SIZE = 20;

interface SearchScreenProps {
  products: EnrichedCatalogProduct[];
  status: CatalogStatus;
  onSelectProduct: (id: number) => void;
}

export function SearchScreen({ products, status, onSelectProduct }: SearchScreenProps) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [shelfId, setShelfId] = useState<number | null>(null);

  const searching = query.trim() !== '';
  const tree = useMemo(() => buildCategoryTree(products), [products]);

  const section = useMemo(
    () => tree.find((candidate) => candidate.id === sectionId) ?? null,
    [tree, sectionId],
  );
  const shelf = useMemo(
    () => section?.shelves.find((candidate) => candidate.id === shelfId) ?? null,
    [section, shelfId],
  );

  const searchResults = useMemo(
    () => (searching ? search(query, products) : []),
    [searching, query, products],
  );
  const shelfProducts = useMemo(
    () => (shelfId !== null ? products.filter((p) => p.categoryPath[1]?.id === shelfId) : []),
    [products, shelfId],
  );

  const listing = searching ? searchResults : shelfProducts;
  const paged = paginate(listing, page, PAGE_SIZE);

  // Every view change resets to the first page. Done in the handlers rather than
  // an effect, so a stale page number can never render an empty list mid-render.
  const resetBrowsing = () => {
    setSectionId(null);
    setShelfId(null);
    setPage(1);
  };

  return (
    <section aria-label="Búsqueda de productos">
      <SearchBar
        value={query}
        onChange={(value) => {
          setQuery(value);
          setPage(1);
          if (value.trim() !== '') {
            setSectionId(null);
            setShelfId(null);
          }
        }}
      />

      {status === 'loading' ? <SearchSkeleton /> : null}
      {status === 'error' ? <ErrorState /> : null}

      {status === 'ready' && searching && searchResults.length === 0 ? <NoResultsState /> : null}

      {status === 'ready' && !searching && sectionId === null ? (
        <SectionGrid
          sections={tree}
          onSelect={(id) => {
            setSectionId(id);
            setShelfId(null);
            setPage(1);
          }}
        />
      ) : null}

      {status === 'ready' && !searching && section && shelfId === null ? (
        <>
          <Breadcrumb
            crumbs={[{ label: 'Categorías', onClick: resetBrowsing }, { label: section.name }]}
          />
          <ShelfList
            section={section}
            onSelect={(id) => {
              setShelfId(id);
              setPage(1);
            }}
          />
        </>
      ) : null}

      {status === 'ready' && listing.length > 0 ? (
        <>
          {searching ? (
            <h2 className="listing__title">
              {listing.length} {listing.length === 1 ? 'resultado' : 'resultados'} para «{query.trim()}»
            </h2>
          ) : (
            <>
              <Breadcrumb
                crumbs={[
                  { label: 'Categorías', onClick: resetBrowsing },
                  {
                    label: section?.name ?? '',
                    onClick: () => {
                      setShelfId(null);
                      setPage(1);
                    },
                  },
                  { label: shelf?.name ?? '' },
                ]}
              />
              <h2 className="listing__title">
                {shelf?.name} · {listing.length} {listing.length === 1 ? 'producto' : 'productos'}
              </h2>
            </>
          )}

          <ul className="product-list" role="list" aria-label="Resultados">
            {paged.items.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                onSelect={() => onSelectProduct(product.id)}
              />
            ))}
          </ul>

          <Pager page={paged.page} pageCount={paged.pageCount} onPageChange={setPage} />
        </>
      ) : null}
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
