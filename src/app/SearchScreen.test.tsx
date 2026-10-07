import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { EnrichedCatalogProduct } from '../types/catalog.ts';
import { SearchScreen } from './SearchScreen.tsx';

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

function renderScreen() {
  const onSelectProduct = vi.fn();
  render(<SearchScreen products={products} status="ready" onSelectProduct={onSelectProduct} />);
  return { onSelectProduct };
}

describe('SearchScreen', () => {
  it('shows category chips when the query is empty', () => {
    renderScreen();
    expect(screen.getByText('Categorías')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fruta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leche y bebidas vegetales' })).toBeInTheDocument();
  });

  it('finds a product typed without accents', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.type(screen.getByRole('searchbox', { name: 'Buscar producto' }), 'platano');
    expect(await screen.findByText('Plátano de Canarias IGP')).toBeInTheDocument();
  });

  it('shows an empty state when nothing matches', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.type(screen.getByRole('searchbox', { name: 'Buscar producto' }), 'zzzzz');
    expect(await screen.findByText('Sin resultados')).toBeInTheDocument();
  });

  it('reports the selected product id on tap', async () => {
    const user = userEvent.setup();
    const { onSelectProduct } = renderScreen();
    await user.type(screen.getByRole('searchbox', { name: 'Buscar producto' }), 'platano');
    await user.click(await screen.findByRole('button', { name: /Plátano de Canarias IGP/ }));
    expect(onSelectProduct).toHaveBeenCalledWith(1);
  });
});
