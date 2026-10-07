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

    render(<ProductScreen product={product} onBack={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Chocolate con leche' })).toBeInTheDocument();
    expect(screen.getByText('Ultraprocesado')).toBeInTheDocument();
    expect(screen.getByText('Clasificación NOVA')).toBeInTheDocument();
    expect(screen.getByText('Información nutricional')).toBeInTheDocument();
    expect(screen.getByText('Ingredientes')).toBeInTheDocument();
    expect(screen.getByText(/cacao y azúcar/)).toBeInTheDocument();
  });

  it('shows "sin datos nutricionales" when no nutrition data exists', () => {
    render(<ProductScreen product={{ ...base, name: 'Manzana Golden' }} onBack={vi.fn()} />);
    expect(screen.getByText('Sin datos nutricionales.')).toBeInTheDocument();
  });

  it('labels a category-rule whole food distinctly', () => {
    render(
      <ProductScreen
        product={{
          ...base,
          name: 'Plátano',
          processing: { basis: 'category-rule', tier: 'whole', additiveMarkers: [] },
        }}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByText('Alimento entero')).toBeInTheDocument();
    expect(screen.getByText('Clasificación por categoría')).toBeInTheDocument();
  });

  it('calls onBack when the back button is tapped', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<ProductScreen product={base} onBack={onBack} />);
    await user.click(screen.getByRole('button', { name: /Volver/ }));
    expect(onBack).toHaveBeenCalled();
  });
});
