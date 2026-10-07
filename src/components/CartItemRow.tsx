import type { CatalogProduct } from '../types/catalog.ts';
import type { CartItem } from '../types/cart.ts';

interface CartItemRowProps {
  item: CartItem;
  product: CatalogProduct;
  onToggle: () => void;
  onRemove: () => void;
}

export function CartItemRow({ item, product, onToggle, onRemove }: CartItemRowProps) {
  return (
    <li className={`cart-item${item.checked ? ' cart-item--checked' : ''}`}>
      <button
        type="button"
        className="cart-item__toggle"
        aria-pressed={item.checked}
        aria-label={item.checked ? `Desmarcar ${product.name}` : `Marcar ${product.name}`}
        onClick={onToggle}
      >
        <span className="cart-item__checkbox" aria-hidden="true" />
      </button>
      <img className="cart-item__thumb" src={product.thumbnail} alt="" loading="lazy" />
      <span className="cart-item__name">{product.name}</span>
      <button
        type="button"
        className="cart-item__remove"
        aria-label={`Eliminar ${product.name}`}
        onClick={onRemove}
      >
        ×
      </button>
    </li>
  );
}
