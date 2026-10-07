import type { CatalogProduct } from '../types/catalog.ts';
import { formatPrice } from '../lib/format.ts';

interface ProductRowProps {
  product: CatalogProduct;
}

export function ProductRow({ product }: ProductRowProps) {
  return (
    <li className="product-row">
      <img
        className="product-row__thumb"
        src={product.thumbnail}
        alt=""
        loading="lazy"
        width="52"
        height="52"
      />
      <div className="product-row__body">
        <p className="product-row__name">{product.name}</p>
        {product.brand ? <p className="product-row__brand">{product.brand}</p> : null}
      </div>
      <span className="product-row__price">{formatPrice(product.unitPrice)}</span>
    </li>
  );
}
