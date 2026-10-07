import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { makeProduct } from '../test-fixtures.ts';
import type { EnrichedCatalogProduct } from '../types/catalog.ts';
import { SearchResults } from './SearchResults.tsx';

const products: EnrichedCatalogProduct[] = [
  makeProduct({ id: 1, name: 'Plátano de Canarias IGP' }),
  makeProduct({ id: 2, name: 'Leche entera', brand: 'Hacendado', unitPrice: 0.96 }),
];

function manyMatches(count: number): EnrichedCatalogProduct[] {
  return Array.from({ length: count }, (_, i) =>
    makeProduct({ id: i + 1, name: `Leche número ${i + 1}` }),
  );
}

function renderResults(overrides: Partial<Parameters<typeof SearchResults>[0]> = {}) {
  const onSelectProduct = vi.fn();
  const view = render(
    <SearchResults
      query="leche"
      products={products}
      status="ready"
      onSelectProduct={onSelectProduct}
      {...overrides}
    />,
  );
  return { onSelectProduct, view };
}

describe('SearchResults', () => {
  it('finds a product typed without accents', () => {
    renderResults({ query: 'platano' });
    expect(screen.getByText('Plátano de Canarias IGP')).toBeInTheDocument();
  });

  it('reports how many results matched, pluralised', () => {
    renderResults({ query: 'platano' });
    expect(screen.getByText(/1 resultado para «platano»/)).toBeInTheDocument();
  });

  it('counts every match, not just the first page', () => {
    renderResults({ query: 'leche', products: manyMatches(45) });
    expect(screen.getByText('45 resultados para «leche»')).toBeInTheDocument();
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
  });

  it('goes back to the first page when the term changes', async () => {
    const user = userEvent.setup();
    const { view } = renderResults({ query: 'leche', products: manyMatches(45) });
    await user.click(screen.getByRole('button', { name: 'Página 2' }));
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();

    view.rerender(
      <SearchResults
        query="numero"
        products={manyMatches(45)}
        status="ready"
        onSelectProduct={vi.fn()}
      />,
    );
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
  });

  it('explains an empty result with the term that found nothing', () => {
    renderResults({ query: 'zzzzz' });
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
    expect(screen.getByText(/no encontramos nada para «zzzzz»/i)).toBeInTheDocument();
  });

  it('reports the selected product', async () => {
    const user = userEvent.setup();
    const { onSelectProduct } = renderResults({ query: 'platano' });
    await user.click(screen.getByRole('button', { name: /Plátano de Canarias IGP/ }));
    expect(onSelectProduct).toHaveBeenCalledWith(1);
  });

  it('shows a loading state instead of an empty result', () => {
    renderResults({ status: 'loading' });
    expect(screen.getByLabelText('Cargando catálogo')).toBeInTheDocument();
    expect(screen.queryByText('Sin resultados')).toBeNull();
  });

  it('reports a failure rather than pretending nothing matched', () => {
    renderResults({ status: 'error' });
    expect(screen.getByText('No se pudo cargar el catálogo')).toBeInTheDocument();
    expect(screen.queryByText('Sin resultados')).toBeNull();
  });
});
