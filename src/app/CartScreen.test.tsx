import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { EnrichedCatalogProduct } from '../types/catalog.ts';
import type { Cart } from '../types/cart.ts';
import { CartScreen } from './CartScreen.tsx';

const base: EnrichedCatalogProduct = {
  id: 1,
  ean: '1',
  slug: 'x',
  name: 'x',
  brand: '',
  categoryPath: [],
  leafCategoryId: 0,
  thumbnail: '',
  photo: '',
  unitPrice: 1,
  bulkPrice: null,
  unitSize: '',
  packaging: null,
  ingredientsHtml: null,
  allergensHtml: null,
  isVariableWeight: false,
  shareUrl: '',
  nutrition: { source: 'none', per100: null, novaGroup: null, additives: [] },
  processing: { basis: 'ingredient-heuristic', tier: 'unknown', additiveMarkers: [] },
};

const products: EnrichedCatalogProduct[] = [
  { ...base, id: 1, name: 'Plátano de Canarias IGP' },
  { ...base, id: 2, name: 'Leche entera' },
];

function renderScreen(cart: Cart) {
  const handlers = { onToggle: vi.fn(), onRemove: vi.fn(), onClear: vi.fn(), onBack: vi.fn() };
  render(
    <CartScreen
      cart={cart}
      products={products}
      onToggle={handlers.onToggle}
      onRemove={handlers.onRemove}
      onClear={handlers.onClear}
      onBack={handlers.onBack}
    />,
  );
  return handlers;
}

describe('CartScreen', () => {
  it('shows an empty state when the list is empty', () => {
    renderScreen({ items: [], updatedAt: '' });
    expect(screen.getByText('La lista está vacía')).toBeInTheDocument();
  });

  it('renders items and toggles them on tap', async () => {
    const user = userEvent.setup();
    const cart: Cart = {
      items: [{ productId: 1, addedAt: '', checked: false }],
      updatedAt: '',
    };
    const { onToggle } = renderScreen(cart);

    expect(screen.getByText('Plátano de Canarias IGP')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Marcar Plátano de Canarias IGP' }));
    expect(onToggle).toHaveBeenCalledWith(1);
  });

  it('removes and clears', async () => {
    const user = userEvent.setup();
    const cart: Cart = {
      items: [{ productId: 2, addedAt: '', checked: false }],
      updatedAt: '',
    };
    const { onRemove, onClear } = renderScreen(cart);

    await user.click(screen.getByRole('button', { name: 'Eliminar Leche entera' }));
    expect(onRemove).toHaveBeenCalledWith(2);

    await user.click(screen.getByRole('button', { name: 'Vaciar lista' }));
    expect(onClear).toHaveBeenCalled();
  });

  it('renders a delisted product as unavailable and still removable', () => {
    const cart: Cart = {
      items: [{ productId: 999, addedAt: '', checked: false }],
      updatedAt: '',
    };
    renderScreen(cart);
    expect(screen.getByText('Producto no disponible')).toBeInTheDocument();
  });
});
