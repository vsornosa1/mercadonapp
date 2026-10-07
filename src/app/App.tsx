import { useState } from 'react';

import { isInCart } from '../lib/cart.ts';
import { CartScreen } from './CartScreen.tsx';
import { ProductScreen } from './ProductScreen.tsx';
import { SearchScreen } from './SearchScreen.tsx';
import { useCart } from './useCart.ts';
import { useCatalog } from './useCatalog.ts';

export function App() {
  const { products, status } = useCatalog();
  const { cart, add, remove, toggle, clear } = useCart();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCart, setShowCart] = useState(false);

  const selected = selectedId != null ? (products.find((p) => p.id === selectedId) ?? null) : null;

  return (
    <>
      <header className="app-header">
        <h1 className="app-header__title">Mercadonapp</h1>
        <button
          type="button"
          className="cart-button"
          aria-label={`Mi lista (${cart.items.length} productos)`}
          onClick={() => {
            setShowCart(true);
            setSelectedId(null);
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          {cart.items.length > 0 ? (
            <span className="cart-button__count">{cart.items.length}</span>
          ) : null}
        </button>
      </header>
      <main className="app-main">
        {selected ? (
          <ProductScreen
            product={selected}
            onBack={() => setSelectedId(null)}
            onAdd={() => add(selected.id)}
            added={isInCart(cart, selected.id)}
          />
        ) : showCart ? (
          <CartScreen
            cart={cart}
            products={products}
            onToggle={toggle}
            onRemove={remove}
            onClear={clear}
            onBack={() => setShowCart(false)}
          />
        ) : (
          <SearchScreen products={products} status={status} onSelectProduct={setSelectedId} />
        )}
      </main>
    </>
  );
}

