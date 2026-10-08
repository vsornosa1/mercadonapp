import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { defaultOrder, nextMode, type OrderPreference } from '../lib/ordering.ts';
import { TRIP_WHY } from '../lib/zones.ts';
import { OrderChip } from './OrderChip.tsx';

function renderChip(order: OrderPreference = defaultOrder()) {
  const onChange = vi.fn();
  render(<OrderChip order={order} onChange={onChange} />);
  return { onChange };
}

/** The real thing is driven by the app, so the test drives it too. */
function ControlledChip() {
  const [order, setOrder] = useState(defaultOrder());
  return <OrderChip order={order} onChange={(mode) => setOrder(nextMode(order, mode))} />;
}

const groupName = () =>
  screen.getByRole('group', { name: /Orden de la lista/ }).getAttribute('aria-label') ?? '';

describe('OrderChip', () => {
  it('states the order in effect, in its accessible name and not only in colour', () => {
    renderChip();
    expect(groupName()).toContain('Orden de compra');
  });

  it('changes what it says when the order changes', async () => {
    const user = userEvent.setup();
    render(<ControlledChip />);
    expect(groupName()).toContain('Orden de compra');

    await user.click(screen.getByRole('button', { name: 'A–Z' }));

    expect(groupName()).toContain('A–Z');
  });

  it('marks the order in effect as the pressed one', () => {
    renderChip({ mode: 'az', zoneOrder: [], withinZone: {} });
    expect(screen.getByRole('button', { name: 'A–Z' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Orden de compra' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('reports the chosen order', async () => {
    const user = userEvent.setup();
    const { onChange } = renderChip();
    await user.click(screen.getByRole('button', { name: 'A–Z' }));
    expect(onChange).toHaveBeenCalledWith('az');
  });

  it('does not offer my order before there is one, rather than a control that is always dead', () => {
    renderChip(defaultOrder());
    expect(screen.queryByRole('button', { name: 'Mi orden' })).toBeNull();
  });

  it('offers my order once something has been arranged', () => {
    renderChip({ mode: 'custom', zoneOrder: ['bebidas'], withinZone: {} });
    expect(screen.getByRole('button', { name: 'Mi orden' })).toBeEnabled();
  });

  it('offers it as the one in effect the moment a move creates it', () => {
    renderChip({ mode: 'custom', zoneOrder: ['bebidas'], withinZone: {} });
    expect(screen.getByRole('button', { name: 'Mi orden' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('explains why the proposed order is what it is', () => {
    renderChip();
    expect(screen.getByText(TRIP_WHY)).toBeInTheDocument();
  });

  it('does not push the explanation when the order is not the proposal', () => {
    renderChip({ mode: 'az', zoneOrder: [], withinZone: {} });
    expect(screen.queryByText(TRIP_WHY)).toBeNull();
  });
});
