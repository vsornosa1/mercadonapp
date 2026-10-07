import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { EnrichedCatalogProduct } from '../types/catalog.ts';
import { SearchScreen } from './SearchScreen.tsx';

function product(
  id: number,
  name: string,
  section: [number, string],
  shelf: [number, string],
  leaf: [number, string],
): EnrichedCatalogProduct {
  return {
    id,
    ean: String(id),
    slug: 'x',
    name,
    brand: '',
    categoryPath: [
      { id: section[0], name: section[1] },
      { id: shelf[0], name: shelf[1] },
      { id: leaf[0], name: leaf[1] },
    ],
    leafCategoryId: leaf[0],
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
}

// 25 products in one shelf, so pagination has a second page at 20 per page.
const many = Array.from({ length: 25 }, (_, i) =>
  product(
    100 + i,
    `Aceite número ${i + 1}`,
    [12, 'Aceite, especias y salsas'],
    [112, 'Aceite, vinagre y sal'],
    [420, 'Aceite de oliva'],
  ),
);
const few = [product(1, 'Plátano de Canarias IGP', [3, 'Fruta y verdura'], [27, 'Fruta'], [853, 'Plátano y uva'])];
const products = [...many, ...few];

function renderScreen() {
  const onSelectProduct = vi.fn();
  render(<SearchScreen products={products} status="ready" onSelectProduct={onSelectProduct} />);
  return { onSelectProduct };
}

async function drillToShelf(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Aceite, especias y salsas/ }));
  await user.click(screen.getByRole('button', { name: /Aceite, vinagre y sal/ }));
}

describe('SearchScreen — browsing', () => {
  it('starts with sections, not a wall of category chips', () => {
    renderScreen();
    expect(screen.getByRole('button', { name: /Aceite, especias y salsas/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fruta y verdura/ })).toBeInTheDocument();
    // the 148 shelves must NOT be rendered at this level
    expect(screen.queryByRole('button', { name: /Plátano y uva/ })).not.toBeInTheDocument();
  });

  it('drills from a section into its shelves', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole('button', { name: /Aceite, especias y salsas/ }));
    expect(screen.getByRole('button', { name: /Aceite, vinagre y sal/ })).toBeInTheDocument();
  });

  it('drills from a shelf into products, showing the count', async () => {
    const user = userEvent.setup();
    renderScreen();
    await drillToShelf(user);
    expect(screen.getByText(/25 productos/)).toBeInTheDocument();
    expect(screen.getByText('Aceite número 1')).toBeInTheDocument();
  });

  it('offers a breadcrumb back up the drill-down', async () => {
    const user = userEvent.setup();
    renderScreen();
    await drillToShelf(user);

    await user.click(screen.getByRole('button', { name: 'Aceite, especias y salsas' }));
    expect(screen.getByRole('button', { name: /Aceite, vinagre y sal/ })).toBeInTheDocument();
  });
});

describe('SearchScreen — pagination', () => {
  it('shows only the first page of a long shelf', async () => {
    const user = userEvent.setup();
    renderScreen();
    await drillToShelf(user);
    expect(document.querySelectorAll('.product-row')).toHaveLength(20);
    expect(screen.queryByText('Aceite número 25')).not.toBeInTheDocument();
  });

  it('advances to a later page', async () => {
    const user = userEvent.setup();
    renderScreen();
    await drillToShelf(user);
    await user.click(screen.getByRole('button', { name: 'Página 2' }));
    expect(screen.getByText('Aceite número 25')).toBeInTheDocument();
    expect(screen.queryByText('Aceite número 1')).not.toBeInTheDocument();
  });

  it('resets to page 1 when the user searches something else', async () => {
    const user = userEvent.setup();
    renderScreen();
    await drillToShelf(user);
    await user.click(screen.getByRole('button', { name: 'Página 2' }));
    await user.type(screen.getByRole('searchbox', { name: 'Buscar producto' }), 'platano');
    expect(screen.getByText('Plátano de Canarias IGP')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Página 2' })).not.toBeInTheDocument();
  });

  it('hides the pager when everything fits on one page', () => {
    renderScreen();
    expect(screen.queryByRole('navigation', { name: 'Paginación' })).not.toBeInTheDocument();
  });
});

describe('SearchScreen — search', () => {
  it('searches without accents and reports the selected product', async () => {
    const user = userEvent.setup();
    const { onSelectProduct } = renderScreen();
    await user.type(screen.getByRole('searchbox', { name: 'Buscar producto' }), 'platano');
    await user.click(await screen.findByRole('button', { name: /Plátano de Canarias IGP/ }));
    expect(onSelectProduct).toHaveBeenCalledWith(1);
  });

  it('shows an empty state when nothing matches', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.type(screen.getByRole('searchbox', { name: 'Buscar producto' }), 'zzzzz');
    expect(await screen.findByText('Sin resultados')).toBeInTheDocument();
  });
});
