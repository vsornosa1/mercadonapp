import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { cartTotal } from '../lib/cart.ts';
import { formatPrice } from '../lib/format.ts';
import { defaultOrder, type OrderPreference } from '../lib/ordering.ts';
import { makeProduct } from '../test-fixtures.ts';
import type { EnrichedCatalogProduct } from '../types/catalog.ts';
import type { Cart } from '../types/cart.ts';
import { CartScreen } from './CartScreen.tsx';

const FRUTA = [
  { id: 3, name: 'Fruta y verdura' },
  { id: 27, name: 'Fruta' },
  { id: 853, name: 'Manzana' },
];
const LACTEOS = [
  { id: 17, name: 'Huevos, leche y mantequilla' },
  { id: 60, name: 'Leche' },
  { id: 61, name: 'Entera' },
];
const LIMPIEZA = [
  { id: 4, name: 'Limpieza y hogar' },
  { id: 40, name: 'Detergente' },
  { id: 41, name: 'Líquido' },
];

const products: EnrichedCatalogProduct[] = [
  makeProduct({ id: 1, name: 'Manzana Golden', unitPrice: 1.19, categoryPath: FRUTA, leafCategoryId: 853 }),
  makeProduct({ id: 2, name: 'Leche entera', unitPrice: 0.96, categoryPath: LACTEOS, leafCategoryId: 61 }),
  makeProduct({ id: 3, name: 'Detergente', unitPrice: 3.5, categoryPath: LIMPIEZA, leafCategoryId: 41 }),
  makeProduct({ id: 4, name: 'Limpiador', unitPrice: 2, categoryPath: LIMPIEZA, leafCategoryId: 41 }),
];

const item = (productId: number, quantity = 1, checked = false) => ({
  productId,
  addedAt: '',
  checked,
  quantity,
});

function renderScreen(cart: Cart, order: OrderPreference = defaultOrder()) {
  const onOrderChange = vi.fn();
  const onToggle = vi.fn();
  const onRemove = vi.fn();
  const onClear = vi.fn();
  const onSetQuantity = vi.fn();

  render(
    <CartScreen
      cart={cart}
      products={products}
      total={cartTotal(cart, products)}
      order={order}
      onOrderChange={onOrderChange}
      onToggle={onToggle}
      onRemove={onRemove}
      onClear={onClear}
      onSetQuantity={onSetQuantity}
    />,
  );

  return { onOrderChange, onToggle, onRemove, onClear, onSetQuantity };
}

const zoneHeadings = () =>
  screen.queryAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);

const summary = () => screen.getByRole('complementary', { name: 'Total de la lista' });

// Nothing here opens the browser's own alert any more: both destructive actions go
// through the app's own modal, which the tests reach by clicking it.

describe('CartScreen', () => {
  it('shows an empty state when the list is empty', () => {
    renderScreen({ items: [], updatedAt: '' });
    expect(screen.getByText('La lista está vacía')).toBeInTheDocument();
  });

  it('renders items and toggles them on tap', async () => {
    const user = userEvent.setup();
    const { onToggle } = renderScreen({ items: [item(1)], updatedAt: '' });

    expect(screen.getByText('Manzana Golden')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Marcar Manzana Golden' }));
    expect(onToggle).toHaveBeenCalledWith(1);
  });

  it('removes a line', async () => {
    const user = userEvent.setup();
    const { onRemove } = renderScreen({ items: [item(2)], updatedAt: '' });

    await user.click(screen.getByRole('button', { name: 'Eliminar Leche entera' }));
    expect(onRemove).toHaveBeenCalledWith(2);
  });

  it('asks before emptying the whole list, in the app rather than a browser alert', async () => {
    const user = userEvent.setup();
    const { onClear } = renderScreen({ items: [item(2), item(1)], updatedAt: '' });

    await user.click(screen.getByRole('button', { name: 'Vaciar lista' }));

    const dialog = screen.getByRole('dialog', { name: '¿Vaciar la lista?' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent('2 productos');
    // Nothing has happened yet: a dialog is a question, not an action.
    expect(onClear).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Vaciar' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('leaves the list alone when the question is called off', async () => {
    const user = userEvent.setup();
    const { onClear } = renderScreen({ items: [item(2)], updatedAt: '' });

    await user.click(screen.getByRole('button', { name: 'Vaciar lista' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClear).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { hidden: true })).not.toHaveAttribute('open');
  });

  it('renders a delisted product as unavailable and still removable', () => {
    renderScreen({ items: [item(999)], updatedAt: '' });
    expect(screen.getByText('Producto no disponible')).toBeInTheDocument();
  });
});

describe('CartScreen — the walk', () => {
  it('groups the list into zones, in trip order, with a heading each', () => {
    renderScreen({ items: [item(2), item(1), item(3)], updatedAt: '' });
    expect(zoneHeadings()).toEqual(['Frescos', 'No alimentación', 'Refrigerados']);
  });

  it('omits a zone with nothing in it, rather than an empty heading', () => {
    renderScreen({ items: [item(1)], updatedAt: '' });
    expect(zoneHeadings()).toEqual(['Frescos']);
    expect(screen.queryByText('Congelados')).toBeNull();
  });

  it('keeps the non-food in its own block, not among the food', () => {
    renderScreen({ items: [item(1), item(3), item(2)], updatedAt: '' });
    const block = screen.getByRole('heading', { name: 'No alimentación' }).closest('section')!;
    expect(within(block).getByText('Detergente')).toBeInTheDocument();
    expect(within(block).queryByText('Manzana Golden')).toBeNull();
  });

  it('follows a custom zone order when there is one', () => {
    renderScreen(
      { items: [item(1), item(2)], updatedAt: '' },
      { mode: 'custom', zoneOrder: ['refrigerados', 'frescos'], withinZone: {} },
    );
    expect(zoneHeadings()).toEqual(['Refrigerados', 'Frescos']);
  });

  it('shows the order chip, so the order in effect is never invisible', () => {
    renderScreen({ items: [item(1)], updatedAt: '' });
    expect(screen.getByRole('group', { name: /Orden de la lista/ })).toBeInTheDocument();
  });

  it('orders the products inside a zone when an arrangement exists', () => {
    renderScreen(
      { items: [item(1), item(2)], updatedAt: '' },
      { mode: 'custom', zoneOrder: [], withinZone: { refrigerados: [2] } },
    );
    expect(zoneHeadings()).toEqual(['Frescos', 'Refrigerados']);
    expect(screen.getByText('Leche entera')).toBeInTheDocument();
  });
});

describe('CartScreen — reordering', () => {
  it('moves a zone up, reporting the whole new order', async () => {
    const user = userEvent.setup();
    const { onOrderChange } = renderScreen({ items: [item(1), item(2)], updatedAt: '' });

    await user.click(screen.getByRole('button', { name: 'Subir la zona Refrigerados' }));

    const reported = onOrderChange.mock.calls[0]![0] as OrderPreference;
    expect(reported.mode).toBe('custom');
    // Relative, not adjacent: the zones between Frescos and Refrigerados are empty
    // on this list, and a step has to clear them to move the block on screen.
    expect(reported.zoneOrder.indexOf('refrigerados')).toBeLessThan(
      reported.zoneOrder.indexOf('frescos'),
    );
  });

  it('reaches a zone reorder by keyboard alone, with no pointer events', async () => {
    const user = userEvent.setup();
    const { onOrderChange } = renderScreen({ items: [item(1), item(2)], updatedAt: '' });

    const button = screen.getByRole('button', { name: 'Subir la zona Refrigerados' });
    button.focus();
    expect(button).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(onOrderChange).toHaveBeenCalledTimes(1);
    expect((onOrderChange.mock.calls[0]![0] as OrderPreference).mode).toBe('custom');
  });

  it('offers no move where there is nowhere to move to', () => {
    renderScreen({ items: [item(1), item(2)], updatedAt: '' });
    expect(screen.getByRole('button', { name: 'Subir la zona Frescos' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Bajar la zona Frescos' })).toBeEnabled();
  });

  it('offers no product reorder in a zone that holds a single product', () => {
    // Two disabled arrows on every row is clutter that says "nothing to do here".
    renderScreen({ items: [item(1), item(2)], updatedAt: '' });
    expect(screen.queryByRole('button', { name: /^Subir Manzana Golden$/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Subir Leche entera$/ })).toBeNull();
    // ...but the zone controls are still there, because the walk is the point.
    expect(screen.getByRole('button', { name: 'Subir la zona Refrigerados' })).toBeEnabled();
  });

  it('moves a product within its zone', async () => {
    const user = userEvent.setup();
    // Two products in the same zone, or there is nowhere to move.
    const { onOrderChange } = renderScreen(
      { items: [item(1), item(3), item(4), item(2)], updatedAt: '' },
      defaultOrder(),
    );

    await user.click(screen.getByRole('button', { name: 'Subir Limpiador' }));

    const reported = onOrderChange.mock.calls[0]![0] as OrderPreference;
    expect(reported.mode).toBe('custom');
    expect(reported.withinZone['no-alimentacion']).toEqual([4, 3]);
  });

  it('applies the arrangement it is given, so the moved product really moves', () => {
    renderScreen(
      { items: [item(3), item(4)], updatedAt: '' },
      { mode: 'custom', zoneOrder: [], withinZone: { 'no-alimentacion': [4, 3] } },
    );
    const items = screen.getAllByRole('listitem').map((li) => li.textContent ?? '');
    expect(items[0]).toContain('Limpiador');
    expect(items[1]).toContain('Detergente');
  });

  it('has nowhere to move a product that is alone in its zone, so it offers none', () => {
    renderScreen({ items: [item(1)], updatedAt: '' });
    expect(screen.queryByRole('button', { name: /^Subir Manzana Golden$/ })).toBeNull();
  });
});

describe('CartScreen — A–Z', () => {
  const az: OrderPreference = { mode: 'az', zoneOrder: [], withinZone: {} };

  it('becomes one flat list by name, with no zone headings', () => {
    renderScreen({ items: [item(1), item(2), item(3)], updatedAt: '' }, az);
    expect(zoneHeadings()).toEqual([]);
    const names = screen.getAllByRole('listitem').map((li) => li.textContent ?? '');
    expect(names[0]).toContain('Detergente');
    expect(names[1]).toContain('Leche entera');
    expect(names[2]).toContain('Manzana Golden');
  });

  it('hides the move controls, because A–Z is explicitly not the walk', () => {
    renderScreen({ items: [item(1), item(2)], updatedAt: '' }, az);
    expect(screen.queryByRole('button', { name: /^Subir/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Bajar/ })).toBeNull();
  });

  it('still shows what the list costs', () => {
    renderScreen({ items: [item(1), item(2)], updatedAt: '' }, az);
    expect(screen.getByRole('complementary', { name: 'Total de la lista' })).toBeInTheDocument();
  });
});

describe('CartScreen — quantities', () => {
  it('says how many of each product are on the list', () => {
    renderScreen({ items: [item(1, 3)], updatedAt: '' });
    expect(screen.getByRole('group', { name: /Cantidad de Manzana Golden/ })).toHaveAccessibleName(
      'Cantidad de Manzana Golden: 3',
    );
  });

  it('adds one more', async () => {
    const user = userEvent.setup();
    const { onSetQuantity } = renderScreen({ items: [item(1, 2)], updatedAt: '' });

    await user.click(screen.getByRole('button', { name: 'Añadir uno de Manzana Golden' }));

    expect(onSetQuantity).toHaveBeenCalledWith(1, 3);
  });

  it('takes one away', async () => {
    const user = userEvent.setup();
    const { onSetQuantity } = renderScreen({ items: [item(1, 4)], updatedAt: '' });

    await user.click(screen.getByRole('button', { name: 'Quitar uno de Manzana Golden' }));

    expect(onSetQuantity).toHaveBeenCalledWith(1, 3);
  });

  it('says what the step down will actually do at the quantity on screen', () => {
    renderScreen({ items: [item(1, 3)], updatedAt: '' });
    expect(screen.getByRole('button', { name: 'Quitar uno de Manzana Golden' })).toBeEnabled();
  });

  it('names the step down as a removal when it is the last one', () => {
    renderScreen({ items: [item(1, 1)], updatedAt: '' });
    expect(
      screen.getByRole('button', { name: 'Quitar Manzana Golden de la lista' }),
    ).toBeEnabled();
  });

  it('takes the last one away by removing the line, rather than leaving a zero', async () => {
    const user = userEvent.setup();
    const { onRemove, onSetQuantity } = renderScreen({ items: [item(1, 1)], updatedAt: '' });

    await user.click(screen.getByRole('button', { name: 'Quitar Manzana Golden de la lista' }));

    expect(onRemove).toHaveBeenCalledWith(1);
    expect(onSetQuantity).not.toHaveBeenCalled();
  });

  it('keeps removing the whole line one tap away when there are several', () => {
    renderScreen({ items: [item(1, 4)], updatedAt: '' });
    // The stepper would need three taps to empty this line; the remove button is
    // still the fast path, so both stay.
    expect(screen.getByRole('button', { name: 'Eliminar Manzana Golden' })).toBeEnabled();
  });

  it('prices each line by its own quantity, so the total adds up on screen', () => {
    // Two lines, so the line price (2,88) differs from the total: with one line
    // both would read 2,88 and the assertion could not tell them apart.
    renderScreen({ items: [item(2, 3), item(1, 1)], updatedAt: '' });
    // A regex, not a string: the currency format uses a no-break space.
    expect(screen.getByText(/2,88/)).toBeInTheDocument();
    expect(summary().textContent).toContain(formatPrice(4.07));
  });

  it('multiplies the quantities into the total', () => {
    renderScreen({ items: [item(1, 2), item(2, 3)], updatedAt: '' });
    expect(summary().textContent).toContain(formatPrice(2 * 1.19 + 3 * 0.96));
  });

  it('says how many items the total covers, quantities included', () => {
    renderScreen({ items: [item(1, 2), item(2, 3)], updatedAt: '' });
    expect(summary().textContent).toContain('5 productos');
  });

  it('does not count lines at the shopper, which the item count already says', () => {
    renderScreen({ items: [item(1, 2), item(2, 3)], updatedAt: '' });
    expect(summary().textContent).not.toMatch(/línea/i);
  });
});

describe('CartScreen — reset', () => {
  const arranged: OrderPreference = { mode: 'custom', zoneOrder: ['bebidas'], withinZone: {} };

  it('asks before throwing away an arrangement', async () => {
    const user = userEvent.setup();
    renderScreen({ items: [item(1)], updatedAt: '' }, arranged);

    await user.click(screen.getByRole('button', { name: 'Restablecer orden' }));

    expect(
      screen.getByRole('dialog', { name: '¿Restablecer el orden?' }),
    ).toBeInTheDocument();
  });

  it('reports the reset only once it is confirmed', async () => {
    const user = userEvent.setup();
    const { onOrderChange } = renderScreen({ items: [item(1)], updatedAt: '' }, arranged);

    await user.click(screen.getByRole('button', { name: 'Restablecer orden' }));
    expect(onOrderChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Restablecer' }));
    expect(onOrderChange).toHaveBeenCalledWith(defaultOrder());
  });

  it('keeps the arrangement when the question is called off', async () => {
    const user = userEvent.setup();
    const { onOrderChange } = renderScreen({ items: [item(1)], updatedAt: '' }, arranged);

    await user.click(screen.getByRole('button', { name: 'Restablecer orden' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onOrderChange).not.toHaveBeenCalled();
  });

  it('offers nothing to reset when the order is still the proposal', () => {
    renderScreen({ items: [item(1)], updatedAt: '' });
    expect(screen.queryByRole('button', { name: 'Restablecer orden' })).toBeNull();
  });
});

describe('CartScreen — what it costs', () => {
  // Read from the summary block rather than by text: Spanish currency uses a
  // no-break space before the €, and Testing Library compares a string matcher
  // against the normalised text.
  it('adds up one of each item, whatever order they are shown in', () => {
    renderScreen({ items: [item(1), item(2)], updatedAt: '' });
    expect(summary().textContent).toContain(formatPrice(2.15));
  });

  it('warns that goods sold by weight are priced from the label, not the scales', () => {
    const weighed = [makeProduct({ id: 3, name: 'Peras', unitPrice: 2.5, isVariableWeight: true })];
    const cart: Cart = { items: [item(3)], updatedAt: '' };
    render(
      <CartScreen
        cart={cart}
        products={weighed}
        total={cartTotal(cart, weighed)}
        order={defaultOrder()}
        onOrderChange={vi.fn()}
        onToggle={vi.fn()}
        onRemove={vi.fn()}
        onClear={vi.fn()}
        onSetQuantity={vi.fn()}
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
