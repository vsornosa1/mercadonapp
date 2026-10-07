import type { CatalogProduct } from '../types/catalog.ts';
import { formatPrice } from '../lib/format.ts';

interface ProductRowProps {
  product: CatalogProduct;
  onSelect: () => void;
}

export function ProductRow({ product, onSelect }: ProductRowProps) {
  return (
    <li className="product-row">
      <button type="button" className="product-row__action" onClick={onSelect}>
        <img
          className="product-row__thumb"
          src={product.thumbnail}
          alt=""
          loading="lazy"
          width="52"
          height="52"
        />
        <span className="product-row__body">
          <span className="product-row__name">{product.name}</span>
          {product.brand ? <span className="product-row__brand">{product.brand}</span> : null}
        </span>
        <span className="product-row__price">{formatPrice(product.unitPrice)}</span>
      </button>
    </li>
  );
}
