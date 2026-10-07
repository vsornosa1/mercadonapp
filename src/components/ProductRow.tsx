import { formatPrice } from '../lib/format.ts';
import type { CatalogProduct } from '../types/catalog.ts';
import { ProductThumb } from './ProductThumb.tsx';

interface ProductRowProps {
  product: CatalogProduct;
  onSelect: () => void;
}

export function ProductRow({ product, onSelect }: ProductRowProps) {
  return (
    <li className="product-row">
      <button type="button" className="product-row__action" onClick={onSelect}>
        <ProductThumb className="product-row__thumb" src={product.thumbnail} size={64} />
        <span className="product-row__body">
          <span className="product-row__name">{product.name}</span>
          {product.brand ? <span className="product-row__brand">{product.brand}</span> : null}
        </span>
        <span className="product-row__aside">
          <span className="product-row__price">{formatPrice(product.unitPrice)}</span>
          <span className="product-row__chevron" aria-hidden="true">
            ›
          </span>
        </span>
      </button>
    </li>
  );
}
