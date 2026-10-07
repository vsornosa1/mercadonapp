import { formatPrice } from '../lib/format.ts';
import type { EnrichedCatalogProduct } from '../types/catalog.ts';
import { ProductThumb } from './ProductThumb.tsx';

interface SimilarListProps {
  products: EnrichedCatalogProduct[];
  onSelect: (id: number) => void;
}

/**
 * What else is on the same shelf.
 *
 * Not a claim about health — that is what the alternatives panel above is for.
 * This answers "what else is here?", which is why it renders for non-food too,
 * and why it is the only thing we can offer for a product we compared and found
 * nothing better for.
 */
export function SimilarList({ products, onSelect }: SimilarListProps) {
  if (products.length === 0) return null;

  return (
    <section className="panel" aria-labelledby="similares-title">
      <h2 id="similares-title" className="panel__title">
        Similares
      </h2>
      <ul className="suggestion-list" role="list">
        {products.map((product) => (
          <li key={product.id}>
            <button
              type="button"
              className="suggestion-item"
              onClick={() => onSelect(product.id)}
              aria-label={`Ver ${product.name}${product.brand ? `, ${product.brand}` : ''}, ${formatPrice(product.unitPrice)}`}
            >
              <ProductThumb className="suggestion-item__thumb" src={product.thumbnail} size={56} />
              <span className="suggestion-item__body">
                <span className="suggestion-item__name">{product.name}</span>
                {product.brand ? (
                  <span className="suggestion-item__brand muted">{product.brand}</span>
                ) : null}
              </span>
              <span className="suggestion-item__aside">
                <span className="suggestion-item__price">{formatPrice(product.unitPrice)}</span>
                <span className="suggestion-item__chevron" aria-hidden="true">
                  ›
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
