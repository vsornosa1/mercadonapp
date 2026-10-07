import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BottomNav } from './BottomNav.tsx';

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderNav(overrides: Partial<Parameters<typeof BottomNav>[0]> = {}) {
  const onSelect = vi.fn();
  render(
    <BottomNav active="browse" cartCount={0} cartTotal={0} onSelect={onSelect} {...overrides} />,
  );
  return { onSelect };
}

describe('BottomNav', () => {
  it('is a labelled navigation landmark', () => {
    renderNav();
    expect(screen.getByRole('navigation', { name: 'Secciones' })).toBeInTheDocument();
  });

  it('offers only the places that are destinations, not a second copy of search', () => {
    renderNav();
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Categorías/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lista/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Buscar/ })).toBeNull();
  });

  it('marks the active tab for assistive technology, not just with colour', () => {
    renderNav({ active: 'cart' });
    expect(screen.getByRole('button', { name: /Lista/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /Categorías/ })).not.toHaveAttribute('aria-current');
  });

  it('reports which tab was chosen', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderNav();
    await user.click(screen.getByRole('button', { name: /Categorías/ }));
    expect(onSelect).toHaveBeenCalledWith('browse');
  });

  it('hides the badge when the list is empty, rather than showing a zero', () => {
    renderNav({ cartCount: 0 });
    expect(document.querySelector('.bottom-nav__badge')).toBeNull();
    expect(screen.getByRole('button', { name: 'Lista' })).toBeInTheDocument();
  });

  it('shows the count and says it in the accessible name, in the correct number', () => {
    const { rerender } = render(
      <BottomNav active="browse" cartCount={1} cartTotal={1.19} onSelect={vi.fn()} />,
    );
    expect(document.querySelector('.bottom-nav__badge')?.textContent).toBe('1');
    expect(screen.getByRole('button', { name: /Lista/ }).getAttribute('aria-label')).toContain(
      '1 producto',
    );

    rerender(<BottomNav active="browse" cartCount={4} cartTotal={12.4} onSelect={vi.fn()} />);
    const label = screen.getByRole('button', { name: /Lista/ }).getAttribute('aria-label');
    expect(label).toContain('4 productos');
  });

  it('says what the list costs, not only how many things are on it', () => {
    renderNav({ cartCount: 3, cartTotal: 12.4 });
    expect(screen.getByRole('button', { name: /Lista/ }).getAttribute('aria-label')).toContain(
      '12,40',
    );
  });
});
