import { useState } from 'react';

import { paginate } from '../lib/pagination.ts';
import type { EnrichedCatalogProduct } from '../types/catalog.ts';
import { Pager } from './Pager.tsx';
import { ProductRow } from './ProductRow.tsx';

const PAGE_SIZE = 20;

interface ProductResultsProps {
  /** Heading shown above the list, e.g. "Fruta · 50 productos". */
  heading: string;
  products: EnrichedCatalogProduct[];
  onSelectProduct: (id: number) => void;
}

/**
 * The paged product list, shared by search and browsing.
 *
 * Page state lives here rather than in each screen, and callers give this
 * component a `key` tied to the query or shelf so a changed list remounts and
 * starts at page 1 — which removes the stale-page problem at its source instead
 * of resetting it by hand in every handler.
 */
export function ProductResults({ heading, products, onSelectProduct }: ProductResultsProps) {
  const [page, setPage] = useState(1);
  const paged = paginate(products, page, PAGE_SIZE);

  return (
    <>
      <h2 className="listing__title">{heading}</h2>
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
  );
}
