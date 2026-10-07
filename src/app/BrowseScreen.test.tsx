import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { makeProduct } from '../test-fixtures.ts';
import { stubViewport } from '../test-media.ts';
import type { CategoryNode, EnrichedCatalogProduct } from '../types/catalog.ts';
import { BrowseScreen } from './BrowseScreen.tsx';

function product(
  id: number,
  name: string,
  section: [number, string],
  shelf: [number, string],
  leaf: [number, string],
): EnrichedCatalogProduct {
  const path: [CategoryNode, CategoryNode, CategoryNode] = [
    { id: section[0], name: section[1] },
    { id: shelf[0], name: shelf[1] },
    { id: leaf[0], name: leaf[1] },
  ];
  return makeProduct({ id, name, categoryPath: path, leafCategoryId: leaf[0] });
}

// 25 products on one shelf, so pagination has a second page at 20 per page.
// Zero-padded so a name is not a prefix of another ("01" vs "10").
const many = Array.from({ length: 25 }, (_, i) =>
  product(
    100 + i,
    `Aceite número ${String(i + 1).padStart(2, '0')}`,
    [12, 'Aceite, especias y salsas'],
    [112, 'Aceite, vinagre y sal'],
    [420, 'Aceite de oliva'],
  ),
);
const few = [product(1, 'Plátano de Canarias IGP', [3, 'Fruta y verdura'], [27, 'Fruta'], [853, 'Plátano y uva'])];
const products = [...many, ...few];

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderScreen(composition: 'phone' | 'desktop' = 'phone') {
  stubViewport(composition);
  const onSelectProduct = vi.fn();
  render(<BrowseScreen products={products} status="ready" onSelectProduct={onSelectProduct} />);
  return { onSelectProduct };
}

const drillToShelf = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /Aceite, especias y salsas/ }));
  await user.click(screen.getByRole('button', { name: /Aceite, vinagre y sal/ }));
};

describe('BrowseScreen — drill-down', () => {
  it('starts with sections, not a wall of category chips', () => {
    renderScreen();
    expect(screen.getByRole('button', { name: /Aceite, especias y salsas/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fruta y verdura/ })).toBeInTheDocument();
    // a shelf must NOT appear at this level
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
    expect(screen.getByText(/25 productos en Aceite, vinagre y sal/)).toBeInTheDocument();
    expect(screen.getByText('Aceite número 01')).toBeInTheDocument();
  });

  it('offers a breadcrumb back up the drill-down', async () => {
    const user = userEvent.setup();
    renderScreen();
    await drillToShelf(user);
    await user.click(screen.getByRole('button', { name: 'Aceite, especias y salsas' }));
    expect(screen.getByRole('button', { name: /Aceite, vinagre y sal/ })).toBeInTheDocument();
  });

  it('returns all the way to the section list from the breadcrumb root', async () => {
    const user = userEvent.setup();
    renderScreen();
    await drillToShelf(user);
    await user.click(screen.getByRole('button', { name: 'Categorías' }));
    expect(screen.getByRole('button', { name: /Fruta y verdura/ })).toBeInTheDocument();
  });

  it('reports the selected product', async () => {
    const user = userEvent.setup();
    const { onSelectProduct } = renderScreen();
    await drillToShelf(user);
    await user.click(screen.getByRole('button', { name: /Aceite número 01/ }));
    expect(onSelectProduct).toHaveBeenCalledWith(100);
  });
});

describe('BrowseScreen — pagination', () => {
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
    expect(screen.queryByText('Aceite número 01')).not.toBeInTheDocument();
  });

  it('starts a different shelf on page 1, so a stale page cannot render empty', async () => {
    const user = userEvent.setup();
    renderScreen();
    await drillToShelf(user);
    await user.click(screen.getByRole('button', { name: 'Página 2' }));
    // Back up and into another section's shelf. The product's shelf is "Fruta";
    // "Plátano y uva" is its leaf, which the drill-down never shows.
    await user.click(screen.getByRole('button', { name: 'Categorías' }));
    await user.click(screen.getByRole('button', { name: /Fruta y verdura/ }));
    await user.click(screen.getByRole('button', { name: /Fruta/ }));

    expect(screen.getByText('Plátano de Canarias IGP')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Página 2' })).not.toBeInTheDocument();
  });

  it('hides the pager when everything fits on one page', () => {
    renderScreen();
    expect(screen.queryByRole('navigation', { name: 'Paginación' })).not.toBeInTheDocument();
  });
});

describe('BrowseScreen — desktop', () => {
  it('shows the sections beside the content instead of a screen of their own', () => {
    renderScreen('desktop');
    expect(
      screen.getByRole('navigation', { name: 'Secciones del supermercado' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fruta y verdura/ })).toBeInTheDocument();
  });

  it('lands on a section rather than an empty pane', () => {
    renderScreen('desktop');
    expect(screen.getByRole('button', { name: /Aceite, vinagre y sal/ })).toBeInTheDocument();
  });

  it('marks which section is on show', async () => {
    const user = userEvent.setup();
    renderScreen('desktop');
    expect(screen.getByRole('button', { name: /Aceite, especias y salsas/ })).toHaveAttribute(
      'aria-current',
      'true',
    );

    await user.click(screen.getByRole('button', { name: /Fruta y verdura/ }));
    expect(screen.getByRole('button', { name: /Fruta y verdura/ })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(screen.getByRole('button', { name: /Aceite, especias y salsas/ })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('changes the shelves beside it when another section is picked', async () => {
    const user = userEvent.setup();
    renderScreen('desktop');
    await user.click(screen.getByRole('button', { name: /Fruta y verdura/ }));
    expect(screen.getByText('Fruta')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aceite, vinagre y sal/ })).not.toBeInTheDocument();
  });

  it('drills into products and back with the breadcrumb', async () => {
    const user = userEvent.setup();
    renderScreen('desktop');
    await user.click(screen.getByRole('button', { name: /Aceite, vinagre y sal/ }));
    expect(screen.getByText('Aceite número 01')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Aceite, especias y salsas' }));
    expect(screen.getByRole('button', { name: /Aceite, vinagre y sal/ })).toBeInTheDocument();
  });

  it('counts the same products in the rail as the shelf it opens', async () => {
    const user = userEvent.setup();
    renderScreen('desktop');
    expect(
      screen.getByRole('button', { name: /Aceite, especias y salsas/ }).textContent,
    ).toContain('25');

    await user.click(screen.getByRole('button', { name: /Aceite, vinagre y sal/ }));
    expect(screen.getByText(/25 productos en Aceite, vinagre y sal/)).toBeInTheDocument();
  });
});


