import { useState } from 'react';

import { ProductScreen } from './ProductScreen.tsx';
import { SearchScreen } from './SearchScreen.tsx';
import { useCatalog } from './useCatalog.ts';

export function App() {
  const { products, status } = useCatalog();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selected = selectedId != null ? (products.find((p) => p.id === selectedId) ?? null) : null;

  return (
    <>
      <header className="app-header">
        <h1 className="app-header__title">Mercadonapp</h1>
      </header>
      <main className="app-main">
        {selected ? (
          <ProductScreen product={selected} onBack={() => setSelectedId(null)} />
        ) : (
          <SearchScreen products={products} status={status} onSelectProduct={setSelectedId} />
        )}
      </main>
    </>
  );
}

