import { useEffect, useMemo, useRef, useState } from 'react';

import { isInCart } from '../lib/cart.ts';
import { buildSwapSignals } from '../lib/swaps.ts';
import type { Swap } from '../types/swaps.ts';
import { CartScreen } from './CartScreen.tsx';
import { ProductScreen, type RecommendationContext } from './ProductScreen.tsx';
import { SearchScreen } from './SearchScreen.tsx';
import { useCart } from './useCart.ts';
import { useCatalog } from './useCatalog.ts';

type View =
  | { kind: 'search' }
  | { kind: 'cart' }
  | { kind: 'product'; id: number; recommendation?: RecommendationContext };

export function App() {
  const { products, status } = useCatalog();
  const { cart, add, remove, toggle, clear } = useCart();
  const [view, setView] = useState<View>({ kind: 'search' });

  const signals = useMemo(() => buildSwapSignals(products), [products]);
  const selected =
    view.kind === 'product' ? (products.find((p) => p.id === view.id) ?? null) : null;

  // On every view change: start at the top, and move focus into the new content
  // so assistive tech announces the change instead of the DOM silently swapping.
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  const viewKey = view.kind === 'product' ? `product:${view.id}` : view.kind;

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    mainRef.current?.focus();
  }, [viewKey]);

  const openProduct = (id: number) => setView({ kind: 'product', id });

  const openSwap = (swap: Swap, from: { id: number; name: string }) => {
    setView({
      kind: 'product',
      id: swap.product.id,
      recommendation: {
        fromName: from.name,
        reasons: swap.reasons,
        onBackToOrigin: () => setView({ kind: 'product', id: from.id }),
      },
    });
  };

  return (
    <>
      <header className="app-header">
        <h1 className="app-header__title">Mercadonapp</h1>
        <button
          type="button"
          className="cart-button"
          aria-label={`Mi lista (${cart.items.length} productos)`}
          onClick={() => setView({ kind: 'cart' })}
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

      <main className="app-main" ref={mainRef} tabIndex={-1}>
        {view.kind === 'product' && selected ? (
          <ProductScreen
            product={selected}
            catalog={products}
            signals={signals}
            recommendation={view.recommendation}
            onBack={() => setView({ kind: 'search' })}
            onAdd={() => add(selected.id)}
            added={isInCart(cart, selected.id)}
            onSelectSwap={(swap) => openSwap(swap, { id: selected.id, name: selected.name })}
          />
        ) : view.kind === 'cart' ? (
          <CartScreen
            cart={cart}
            products={products}
            onToggle={toggle}
            onRemove={remove}
            onClear={clear}
            onBack={() => setView({ kind: 'search' })}
          />
        ) : (
          <SearchScreen products={products} status={status} onSelectProduct={openProduct} />
        )}
      </main>
    </>
  );
}
