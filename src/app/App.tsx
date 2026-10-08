import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { AppHeader } from '../components/AppHeader.tsx';
import { BottomNav } from '../components/BottomNav.tsx';
import type { TabId } from '../components/nav-tabs.tsx';
import { cartTotal, isInCart } from '../lib/cart.ts';
import { buildSwapSignals } from '../lib/swaps.ts';
import type { Swap } from '../types/swaps.ts';
import { BrowseScreen } from './BrowseScreen.tsx';
import { CartScreen } from './CartScreen.tsx';
import { ProductScreen, type RecommendationContext } from './ProductScreen.tsx';
import { SearchResults } from './SearchResults.tsx';
import { useCart } from './useCart.ts';
import { useCatalog } from './useCatalog.ts';
import { useIsDesktop } from './useMediaQuery.ts';
import { useOrder } from './useOrder.ts';

interface OpenProduct {
  id: number;
  recommendation?: RecommendationContext;
}

export function App() {
  const { products, status } = useCatalog();
  const { cart, add, remove, toggle, clear, quantity } = useCart();
  const { order, change: changeOrder } = useOrder();
  const isDesktop = useIsDesktop();

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<TabId>('browse');
  const [openProduct, setOpenProduct] = useState<OpenProduct | null>(null);

  const signals = useMemo(() => buildSwapSignals(products), [products]);
  const selected =
    openProduct === null ? null : (products.find((p) => p.id === openProduct.id) ?? null);
  const totals = useMemo(() => cartTotal(cart, products), [cart, products]);
  const term = query.trim();

  // On every *place* change, start at the top and move focus into the content so
  // assistive tech announces it instead of the DOM swapping silently. A search
  // deliberately does not count: the caret is in the field, and moving focus
  // would interrupt the typing that caused it.
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  const viewKey = selected !== null ? `product:${selected.id}` : tab;

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    mainRef.current?.focus();
  }, [viewKey]);

  const openSwap = (swap: Swap, from: { id: number; name: string }) => {
    setOpenProduct({
      id: swap.product.id,
      recommendation: {
        fromName: from.name,
        reasons: swap.reasons,
        onBackToOrigin: () => setOpenProduct({ id: from.id }),
      },
    });
  };

  // Choosing a section is also how you leave a search, so the field is cleared:
  // a query that outlived the click would keep overriding the tab.
  const selectTab = (next: TabId) => {
    setTab(next);
    setOpenProduct(null);
    setQuery('');
  };

  // One ordered decision rather than several independent conditions: an open
  // product wins, then a search in progress, then the chosen section.
  let content: ReactNode;
  if (selected !== null) {
    content = (
      <ProductScreen
        product={selected}
        catalog={products}
        signals={signals}
        recommendation={openProduct?.recommendation}
        onBack={() => setOpenProduct(null)}
        onAdd={() => add(selected.id)}
        added={isInCart(cart, selected.id)}
        onSelectSwap={(swap) => openSwap(swap, { id: selected.id, name: selected.name })}
        onSelectSimilar={(id) => setOpenProduct({ id })}
      />
    );
  } else if (term !== '') {
    content = (
      <SearchResults
        query={query}
        products={products}
        status={status}
        onSelectProduct={(id) => setOpenProduct({ id })}
      />
    );
  } else if (tab === 'cart') {
    content = (
      <CartScreen
        cart={cart}
        products={products}
        total={totals}
        order={order}
        onOrderChange={changeOrder}
        onToggle={toggle}
        onRemove={remove}
        onClear={clear}
        onSetQuantity={quantity}
      />
    );
  } else {
    content = (
      <BrowseScreen
        products={products}
        status={status}
        onSelectProduct={(id) => setOpenProduct({ id })}
      />
    );
  }

  return (
    <>
      <AppHeader
        query={query}
        onQueryChange={setQuery}
        activeTab={selected === null ? tab : null}
        onSelectTab={selectTab}
        cartCount={totals.units}
        cartTotal={totals.total}
        // The tabs are absent exactly when the bar has to carry the list.
        listButton={!isDesktop && selected !== null}
      />

      <main className="app-main" ref={mainRef} tabIndex={-1}>
        {content}
      </main>

      {/* A phone hides the tabs while a product is open — it is a pushed view
          with its own way back, and tabs underneath invite losing your place.
          On a window the tabs live in the app bar and stay, because an app bar
          that empties itself is a dead end. */}
      {selected === null && !isDesktop ? (
        <BottomNav
          active={tab}
          cartCount={totals.units}
          cartTotal={totals.total}
          onSelect={selectTab}
        />
      ) : null}
    </>
  );
}
