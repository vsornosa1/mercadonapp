import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CatalogProduct } from '../types/catalog.ts';
import { SearchScreen } from './SearchScreen.tsx';

const base: CatalogProduct = {
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
};

const products: CatalogProduct[] = [
  {
    ...base,
    id: 1,
    name: 'Plátano de Canarias IGP',
    unitPrice: 2.49,
    categoryPath: [
      { id: 3, name: 'Fruta y verdura' },
      { id: 27, name: 'Fruta' },
      { id: 853, name: 'Plátano y uva' },
    ],
  },
  {
    ...base,
    id: 2,
    name: 'Leche entera',
    brand: 'Hacendado',
    unitPrice: 0.89,
    categoryPath: [
      { id: 4, name: 'Huevos, leche y mantequilla' },
      { id: 72, name: 'Leche y bebidas vegetales' },
      { id: 5, name: 'Leche entera' },
    ],
  },
];

function stubCatalog() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => products })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SearchScreen', () => {
  it('shows category chips when the query is empty', async () => {
    stubCatalog();
    render(<SearchScreen />);

    expect(await screen.findByText('Categorías')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fruta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leche y bebidas vegetales' })).toBeInTheDocument();
  });

  it('finds a product typed without accents', async () => {
    stubCatalog();
    const user = userEvent.setup();
    render(<SearchScreen />);

    await screen.findByText('Categorías');
    await user.type(screen.getByRole('searchbox', { name: 'Buscar producto' }), 'platano');

    expect(await screen.findByText('Plátano de Canarias IGP')).toBeInTheDocument();
  });

  it('shows an empty state when nothing matches', async () => {
    stubCatalog();
    const user = userEvent.setup();
    render(<SearchScreen />);

    await screen.findByText('Categorías');
    await user.type(screen.getByRole('searchbox', { name: 'Buscar producto' }), 'zzzzz');

    expect(await screen.findByText('Sin resultados')).toBeInTheDocument();
  });
});
