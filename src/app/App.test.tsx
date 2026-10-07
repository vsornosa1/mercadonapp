import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeProduct } from '../test-fixtures.ts';
import { stubViewport } from '../test-media.ts';
import { CART_STORAGE_KEY } from '../lib/cart.ts';
import { App } from './App.tsx';

const catalog = [
  makeProduct({
    id: 1,
    name: 'Plátano de Canarias IGP',
    unitPrice: 1.19,
    categoryPath: [
      { id: 3, name: 'Fruta y verdura' },
      { id: 27, name: 'Fruta' },
      { id: 853, name: 'Plátano y uva' },
    ],
    leafCategoryId: 853,
  }),
  makeProduct({ id: 2, name: 'Leche entera', brand: 'Hacendado', unitPrice: 0.96 }),
];

function renderApp(composition: 'phone' | 'desktop' = 'phone') {
  stubViewport(composition);
  render(<App />);
  return userEvent.setup();
}

const searchField = () => screen.getByRole('searchbox', { name: 'Buscar producto' });

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => catalog })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App — where it starts', () => {
  it('opens on the sections, because search is not somewhere you navigate to', async () => {
    renderApp();
    expect(await screen.findByRole('button', { name: /Fruta y verdura/ })).toBeInTheDocument();
  });

  it('has no tab that leads to a second copy of the search field', async () => {
    renderApp();
    await screen.findByRole('button', { name: /Fruta y verdura/ });
    expect(screen.queryByRole('button', { name: 'Buscar' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Categorías' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lista' })).toBeInTheDocument();
  });
});

describe('App — searching from anywhere', () => {
  it('replaces the section with results as soon as something is typed', async () => {
    const user = renderApp();
    await screen.findByRole('button', { name: /Fruta y verdura/ });

    await user.type(searchField(), 'platano');

    expect(await screen.findByText(/1 resultado para «platano»/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Fruta y verdura/ })).toBeNull();
  });

  it('puts the section back when the field is cleared', async () => {
    const user = renderApp();
    await screen.findByRole('button', { name: /Fruta y verdura/ });
    await user.type(searchField(), 'platano');
    await screen.findByText(/1 resultado para «platano»/);

    await user.clear(searchField());

    expect(await screen.findByRole('button', { name: /Fruta y verdura/ })).toBeInTheDocument();
  });

  it('leaves the search behind when a section is chosen, rather than letting it win', async () => {
    const user = renderApp();
    await screen.findByRole('button', { name: /Fruta y verdura/ });
    await user.type(searchField(), 'platano');
    await screen.findByText(/1 resultado para «platano»/);

    await user.click(screen.getByRole('button', { name: 'Lista' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Mi lista' })).toBeInTheDocument();
    expect(searchField()).toHaveValue('');
  });
});

describe('App — the list', () => {
  it('shows the list when its section is chosen', async () => {
    const user = renderApp();
    await screen.findByRole('button', { name: /Fruta y verdura/ });
    await user.click(screen.getByRole('button', { name: 'Lista' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Mi lista' })).toBeInTheDocument();
  });

  it('says what the list costs in the navigation, without opening it', async () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        items: [{ productId: 2, addedAt: '2026-10-06T12:00:00Z', checked: false }],
        updatedAt: '2026-10-06T12:00:00Z',
      }),
    );
    renderApp();

    const listTab = await screen.findByRole('button', { name: /Lista/ });
    expect(listTab.getAttribute('aria-label')).toContain('0,96');
  });
});

describe('App — a product', () => {
  it('opens from the results and steps the phone navigation aside', async () => {
    const user = renderApp();
    await screen.findByRole('button', { name: /Fruta y verdura/ });
    await user.type(searchField(), 'platano');
    await user.click(await screen.findByRole('button', { name: /Plátano de Canarias IGP/ }));

    expect(
      screen.getByRole('heading', { level: 1, name: 'Plátano de Canarias IGP' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Secciones' })).toBeNull();
  });

  it('goes back to the results you came from', async () => {
    const user = renderApp();
    await screen.findByRole('button', { name: /Fruta y verdura/ });
    await user.type(searchField(), 'platano');
    await user.click(await screen.findByRole('button', { name: /Plátano de Canarias IGP/ }));
    await user.click(screen.getByRole('button', { name: /Volver/ }));

    expect(await screen.findByText(/1 resultado para «platano»/)).toBeInTheDocument();
  });

  it('keeps the sections in the bar on desktop, so the app is never a dead end', async () => {
    const user = renderApp('desktop');
    await screen.findByRole('button', { name: /Fruta y verdura/ });
    await user.type(searchField(), 'platano');
    await user.click(await screen.findByRole('button', { name: /Plátano de Canarias IGP/ }));

    expect(screen.getByRole('navigation', { name: 'Secciones' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Categorías' }));
    expect(screen.queryByRole('heading', { level: 1, name: 'Plátano de Canarias IGP' })).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Secciones del supermercado' })).toBeInTheDocument();
  });
});
