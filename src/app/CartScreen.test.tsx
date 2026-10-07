import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { cartTotal } from '../lib/cart.ts';
import { formatPrice } from '../lib/format.ts';
import { makeProduct } from '../test-fixtures.ts';
import type { EnrichedCatalogProduct } from '../types/catalog.ts';
import type { Cart } from '../types/cart.ts';
import { CartScreen } from './CartScreen.tsx';

const products: EnrichedCatalogProduct[] = [
  makeProduct({ id: 1, name: 'Plátano de Canarias IGP', unitPrice: 1.19 }),
  makeProduct({ id: 2, name: 'Leche entera', unitPrice: 0.96 }),
];

function item(productId: number) {
  return { productId, addedAt: '', checked: false };
}

function renderScreen(cart: Cart) {
  const handlers = { onToggle: vi.fn(), onRemove: vi.fn(), onClear: vi.fn() };
  render(
    <CartScreen
      cart={cart}
      products={products}
      total={cartTotal(cart, products)}
      onToggle={handlers.onToggle}
      onRemove={handlers.onRemove}
      onClear={handlers.onClear}
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
    const cart: Cart = { items: [item(1)], updatedAt: '' };
    const { onToggle } = renderScreen(cart);

    expect(screen.getByText('Plátano de Canarias IGP')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Marcar Plátano de Canarias IGP' }));
    expect(onToggle).toHaveBeenCalledWith(1);
  });

  it('removes and clears', async () => {
    const user = userEvent.setup();
    const cart: Cart = { items: [item(2)], updatedAt: '' };
    const { onRemove, onClear } = renderScreen(cart);

    await user.click(screen.getByRole('button', { name: 'Eliminar Leche entera' }));
    expect(onRemove).toHaveBeenCalledWith(2);

    await user.click(screen.getByRole('button', { name: 'Vaciar lista' }));
    expect(onClear).toHaveBeenCalled();
  });

  it('renders a delisted product as unavailable and still removable', () => {
    renderScreen({ items: [item(999)], updatedAt: '' });
    expect(screen.getByText('Producto no disponible')).toBeInTheDocument();
  });
});

describe('CartScreen — what it costs', () => {
  // The amount is read from the summary block rather than by text: Spanish
  // currency uses a no-break space before the €, and Testing Library compares a
  // string matcher against the normalised text.
  const summary = () => screen.getByRole('complementary', { name: 'Total de la lista' });

  it('adds up one of each item', () => {
    renderScreen({ items: [item(1), item(2)], updatedAt: '' });
    expect(summary().textContent).toContain(formatPrice(2.15));
  });

  it('says the total assumes one of each, rather than letting it read as a receipt', () => {
    renderScreen({ items: [item(1)], updatedAt: '' });
    expect(screen.getByText('Un artículo de cada uno.')).toBeInTheDocument();
  });

  it('warns that goods sold by weight are priced from the label, not the scales', () => {
    const weighed = [makeProduct({ id: 3, name: 'Peras', unitPrice: 2.5, isVariableWeight: true })];
    const cart: Cart = { items: [item(3)], updatedAt: '' };
    render(
      <CartScreen
        cart={cart}
        products={weighed}
        total={cartTotal(cart, weighed)}
        onToggle={vi.fn()}
        onRemove={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByText(/al peso/i)).toBeInTheDocument();
  });

  it('leaves out a product the catalogue no longer has, and says so', () => {
    renderScreen({ items: [item(999), item(1)], updatedAt: '' });
    expect(summary().textContent).toContain(formatPrice(1.19));
    expect(screen.getByText(/ya no está/i)).toBeInTheDocument();
  });

  it('shows no total at all for an empty list, rather than a confident zero', () => {
    renderScreen({ items: [], updatedAt: '' });
    expect(screen.queryByRole('complementary', { name: 'Total de la lista' })).toBeNull();
  });
});
