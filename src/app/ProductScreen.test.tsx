import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { EnrichedCatalogProduct } from '../types/catalog.ts';
import { ProductScreen } from './ProductScreen.tsx';

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

function renderScreen(product: EnrichedCatalogProduct, overrides: Partial<{ added: boolean }> = {}) {
  const onBack = vi.fn();
  const onAdd = vi.fn();
  render(
    <ProductScreen
      product={product}
      onBack={onBack}
      onAdd={onAdd}
      added={overrides.added ?? false}
    />,
  );
  return { onBack, onAdd };
}

describe('ProductScreen', () => {
  it('renders name, badge, nutrition and ingredients', () => {
    const product: EnrichedCatalogProduct = {
      ...base,
      name: 'Chocolate con leche',
      brand: 'Hacendado',
      unitPrice: 1.85,
      ingredientsHtml: '<p>Ingredientes: <strong>cacao</strong> y azúcar.</p>',
      nutrition: {
        source: 'off',
        offCode: '1',
        per100: {
          kcal: 530,
          protein: 5,
          carbs: 55,
          fat: 30,
          saturatedFat: 18,
          sugars: 50,
          salt: 0.1,
          fiber: 8,
        },
        novaGroup: 4,
        additives: [],
      },
      processing: { basis: 'off-nova', tier: 'ultra-processed', additiveMarkers: [] },
    };

    renderScreen(product);

    expect(screen.getByRole('heading', { name: 'Chocolate con leche' })).toBeInTheDocument();
    expect(screen.getByText('Ultraprocesado')).toBeInTheDocument();
    expect(screen.getByText('Clasificación NOVA')).toBeInTheDocument();
    expect(screen.getByText('Información nutricional')).toBeInTheDocument();
    expect(screen.getByText('Ingredientes')).toBeInTheDocument();
    expect(screen.getByText(/cacao y azúcar/)).toBeInTheDocument();
  });

  it('shows "sin datos nutricionales" when no nutrition data exists', () => {
    renderScreen({ ...base, name: 'Manzana Golden' });
    expect(screen.getByText('Sin datos nutricionales.')).toBeInTheDocument();
  });

  it('labels a category-rule whole food distinctly', () => {
    renderScreen({
      ...base,
      name: 'Plátano',
      processing: { basis: 'category-rule', tier: 'whole', additiveMarkers: [] },
    });
    expect(screen.getByText('Alimento entero')).toBeInTheDocument();
    expect(screen.getByText('Clasificación por categoría')).toBeInTheDocument();
  });

  it('calls onBack when the back button is tapped', async () => {
    const user = userEvent.setup();
    const { onBack } = renderScreen(base);
    await user.click(screen.getByRole('button', { name: /Volver/ }));
    expect(onBack).toHaveBeenCalled();
  });

  it('calls onAdd, and disables the button once added', async () => {
    const user = userEvent.setup();
    const { onAdd } = renderScreen(base);
    await user.click(screen.getByRole('button', { name: 'Añadir a la lista' }));
    expect(onAdd).toHaveBeenCalled();

    renderScreen(base, { added: true });
    expect(screen.getByRole('button', { name: 'En la lista ✓' })).toBeDisabled();
  });
});
