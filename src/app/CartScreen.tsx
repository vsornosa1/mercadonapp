import { CartItemRow } from '../components/CartItemRow.tsx';
import type { EnrichedCatalogProduct } from '../types/catalog.ts';
import type { Cart } from '../types/cart.ts';

interface CartScreenProps {
  cart: Cart;
  products: EnrichedCatalogProduct[];
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
  onBack: () => void;
}

export function CartScreen({ cart, products, onToggle, onRemove, onClear, onBack }: CartScreenProps) {
  const rows = cart.items.map((item) => ({
    item,
    product: products.find((p) => p.id === item.productId),
  }));

  return (
    <section aria-label="Mi lista">
      <button type="button" className="back-button" onClick={onBack}>
        ← Volver
      </button>
      <h2 className="cart-title">Mi lista</h2>

      {cart.items.length === 0 ? (
        <div className="state" role="status">
          <h3 className="state__title">La lista está vacía</h3>
          <p className="state__hint">Busca un producto y añádelo a la lista.</p>
        </div>
      ) : (
        <>
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
        </>
      )}
    </section>
  );
}
