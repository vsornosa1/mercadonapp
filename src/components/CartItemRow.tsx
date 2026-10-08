import type { MoveDirection } from '../lib/ordering.ts';
import type { CatalogProduct } from '../types/catalog.ts';
import type { CartItem } from '../types/cart.ts';
import { MoveControls } from './MoveControls.tsx';
import { ProductThumb } from './ProductThumb.tsx';

interface CartItemRowProps {
  item: CartItem;
  product: CatalogProduct;
  /** Absent when reordering is not on offer — in A–Z, which is not the walk. */
  reorder?: {
    canMoveUp: boolean;
    canMoveDown: boolean;
    onMove: (direction: MoveDirection) => void;
  };
  onToggle: () => void;
  onRemove: () => void;
}

export function CartItemRow({ item, product, reorder, onToggle, onRemove }: CartItemRowProps) {
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
      <ProductThumb className="cart-item__thumb" src={product.thumbnail} size={44} />
      <span className="cart-item__name">{product.name}</span>
      {reorder ? (
        <MoveControls what={product.name} {...reorder} />
      ) : null}
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
