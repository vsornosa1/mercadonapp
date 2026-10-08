import { formatPrice } from '../lib/format.ts';
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
  onSetQuantity: (quantity: number) => void;
}

/**
 * A row in the list.
 *
 * The quantity stepper cannot go below one: *none* of something is what the remove
 * button is for, so the last step down is disabled rather than deleting a row the
 * user was only trying to reduce. Two affordances, each doing exactly one thing.
 */
export function CartItemRow({
  item,
  product,
  reorder,
  onToggle,
  onRemove,
  onSetQuantity,
}: CartItemRowProps) {
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

      <span className="cart-item__price">{formatPrice(product.unitPrice * item.quantity)}</span>

      <span
        className="stepper"
        role="group"
        aria-label={`Cantidad de ${product.name}: ${item.quantity}`}
      >
        <button
          type="button"
          className="stepper__button"
          aria-label={`Quitar uno de ${product.name}`}
          disabled={item.quantity <= 1}
          onClick={() => onSetQuantity(item.quantity - 1)}
        >
          −
        </button>
        <span className="stepper__value" aria-hidden="true">
          {item.quantity}
        </span>
        <button
          type="button"
          className="stepper__button"
          aria-label={`Añadir uno de ${product.name}`}
          onClick={() => onSetQuantity(item.quantity + 1)}
        >
          +
        </button>
      </span>

      {reorder ? <MoveControls what={product.name} {...reorder} /> : null}

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
