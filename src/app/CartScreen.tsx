import { CartItemRow } from '../components/CartItemRow.tsx';
import { CartSummary } from '../components/CartSummary.tsx';
import { StateMessage } from '../components/StateMessage.tsx';
import type { CartTotal } from '../lib/cart.ts';
import type { EnrichedCatalogProduct } from '../types/catalog.ts';
import type { Cart } from '../types/cart.ts';

interface CartScreenProps {
  cart: Cart;
  products: EnrichedCatalogProduct[];
  /** Priced by the app, so the total in the navigation and here are one number. */
  total: CartTotal;
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
}

/**
 * The list, with what it costs.
 *
 * On a phone the total is a bar fixed above the tabs, because the whole point of
 * reading it is to know where you stand in the aisle without scrolling back. On
 * a window it is a card beside the list, where there is room for it and nothing
 * to obscure.
 */
export function CartScreen({ cart, products, total, onToggle, onRemove, onClear }: CartScreenProps) {
  const rows = cart.items.map((item) => ({
    item,
    product: products.find((p) => p.id === item.productId),
  }));

  return (
    <section aria-label="Mi lista">
      <h1 className="screen-title">Mi lista</h1>

      {cart.items.length === 0 ? (
        <StateMessage
          icon="cart"
          title="La lista está vacía"
          hint="Busca un producto y añádelo. Aquí podrás ir tachándolo en la tienda."
        />
      ) : (
        <div className="cart-layout">
          <div className="cart-layout__list">
            <ul className="cart-list" role="list">
              {rows.map(({ item, product }) =>
                product ? (
                  <CartItemRow
                    key={item.productId}
                    item={item}
                    product={product}
                    onToggle={() => onToggle(item.productId)}
                    onRemove={() => onRemove(item.productId)}
                  />
                ) : (
                  <li key={item.productId} className="cart-item cart-item--missing">
                    <span className="cart-item__name muted">Producto no disponible</span>
                    <button
                      type="button"
                      className="cart-item__remove"
                      aria-label="Eliminar producto no disponible"
                      onClick={() => onRemove(item.productId)}
                    >
                      ×
                    </button>
                  </li>
                ),
              )}
            </ul>
            <button type="button" className="cart-clear" onClick={onClear}>
              Vaciar lista
            </button>
          </div>

          <CartSummary total={total} />
        </div>
      )}
    </section>
  );
}
