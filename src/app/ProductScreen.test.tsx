import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { SwapSignals } from '../lib/swaps.ts';
import type { EnrichedCatalogProduct } from '../types/catalog.ts';
import { ProductScreen } from './ProductScreen.tsx';

const base: EnrichedCatalogProduct = {
  id: 1,
  ean: '1',
  slug: 'x',
  name: 'x',
  brand: '',
  categoryPath: [
    { id: 12, name: 'Aceite, especias y salsas' },
    { id: 112, name: 'Aceite, vinagre y sal' },
    { id: 420, name: 'Aceite de oliva' },
  ],
  leafCategoryId: 420,
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

const richSignals: SwapSignals = {
  tier: 'ultra-processed',
  additiveCount: 2,
  additiveCodes: ['407'],
  novaGroup: 4,
  protein: 5,
  sugars: 12,
  salt: 0.2,
};
const cleanSignals: SwapSignals = {
  tier: 'whole',
  additiveCount: 0,
  additiveCodes: [],
  novaGroup: 1,
  protein: 9,
  sugars: 2,
  salt: 0.05,
};

function renderScreen(overrides: Partial<Parameters<typeof ProductScreen>[0]> = {}) {
  const handlers = { onBack: vi.fn(), onAdd: vi.fn(), onSelectSwap: vi.fn() };
  render(
    <ProductScreen
      product={base}
      catalog={[base]}
      signals={new Map()}
      added={false}
      {...handlers}
      {...overrides}
    />,
  );
  return handlers;
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

    renderScreen({ product });

    expect(screen.getByRole('heading', { name: 'Chocolate con leche' })).toBeInTheDocument();
    expect(screen.getByText('Ultraprocesado')).toBeInTheDocument();
    expect(screen.getByText('Clasificación NOVA')).toBeInTheDocument();
    expect(screen.getByText('Información nutricional')).toBeInTheDocument();
    expect(screen.getByText(/cacao y azúcar/)).toBeInTheDocument();
  });

  it('shows "sin datos nutricionales" when no nutrition data exists', () => {
    renderScreen({ product: { ...base, name: 'Manzana Golden' } });
    expect(screen.getByText('Sin datos nutricionales.')).toBeInTheDocument();
  });

  it('hides the nutrition panel entirely for non-food — "per 100 g" is meaningless for shampoo', () => {
    const shampoo: EnrichedCatalogProduct = {
      ...base,
      name: 'Champú Anticaída',
      categoryPath: [
        { id: 2, name: 'Cuidado del cabello' },
        { id: 31, name: 'Champú' },
        { id: 900, name: 'Champú normal' },
      ],
    };
    renderScreen({ product: shampoo });
    expect(screen.queryByText('Información nutricional')).not.toBeInTheDocument();
    expect(screen.queryByText('Sin datos nutricionales.')).not.toBeInTheDocument();
  });

  it('hides the processing badge for non-food — its labels describe food, not cosmetics', () => {
    const shampoo: EnrichedCatalogProduct = {
      ...base,
      name: 'Champú Anticaída',
      categoryPath: [
        { id: 2, name: 'Cuidado del cabello' },
        { id: 31, name: 'Champú' },
        { id: 900, name: 'Champú normal' },
      ],
    };
    renderScreen({ product: shampoo });
    expect(screen.queryByText('Sin datos')).not.toBeInTheDocument();
    expect(screen.queryByText('Alimento entero')).not.toBeInTheDocument();
  });

  it('still shows the ingredient list for non-food, where it is genuinely useful', () => {
    const shampoo: EnrichedCatalogProduct = {
      ...base,
      name: 'Champú Anticaída',
      ingredientsHtml: '<p>Aqua, Sodium Laureth Sulfate, Parfum.</p>',
      categoryPath: [
        { id: 2, name: 'Cuidado del cabello' },
        { id: 31, name: 'Champú' },
        { id: 900, name: 'Champú normal' },
      ],
    };
    renderScreen({ product: shampoo });
    expect(screen.getByText('Ingredientes')).toBeInTheDocument();
    expect(screen.getByText(/Sodium Laureth Sulfate/)).toBeInTheDocument();
  });

  it('labels a category-rule whole food as fresh, not as a whole-food claim', () => {
    renderScreen({
      product: {
        ...base,
        processing: { basis: 'category-rule', tier: 'whole', additiveMarkers: [] },
      },
    });
    expect(screen.getByText('Fresco')).toBeInTheDocument();
    expect(screen.getByText('por categoría')).toBeInTheDocument();
    expect(screen.queryByText('Alimento entero')).not.toBeInTheDocument();
  });

  it('calls onBack when the back button is tapped', async () => {
    const user = userEvent.setup();
    const { onBack } = renderScreen();
    await user.click(screen.getByRole('button', { name: /Volver/ }));
    expect(onBack).toHaveBeenCalled();
  });

  it('calls onAdd, and disables the button once added', async () => {
    const user = userEvent.setup();
    const { onAdd } = renderScreen();
    await user.click(screen.getByRole('button', { name: 'Añadir a la lista' }));
    expect(onAdd).toHaveBeenCalled();
  });

  it('shows the added state as a disabled button', () => {
    renderScreen({ added: true });
    expect(screen.getByRole('button', { name: 'En la lista ✓' })).toBeDisabled();
  });

  it('shows the recommendation banner, with the reasons, when arriving from an alternative', () => {
    renderScreen({
      recommendation: {
        fromName: 'Yogur azucarado',
        reasons: [{ kind: 'sugars', from: 18, to: 3.6 }],
        onBackToOrigin: vi.fn(),
      },
    });
    expect(screen.getByText(/Recomendado en lugar de/)).toHaveTextContent('Yogur azucarado');
    expect(screen.getByText('Menos azúcar')).toBeInTheDocument();
    expect(screen.getByText('18 g → 3,6 g')).toBeInTheDocument();
  });

  it('shows no banner for a product opened normally', () => {
    renderScreen();
    expect(screen.queryByText(/Recomendado en lugar de/)).not.toBeInTheDocument();
  });

  it('opens an alternative when it is tapped', async () => {
    const user = userEvent.setup();
    const better: EnrichedCatalogProduct = { ...base, id: 2, name: 'Aceite mejor' };
    const signals = new Map<number, SwapSignals>([
      [1, richSignals],
      [2, cleanSignals],
    ]);
    const { onSelectSwap } = renderScreen({ catalog: [base, better], signals });

    await user.click(await screen.findByRole('button', { name: /Ver Aceite mejor/ }));
    expect(onSelectSwap).toHaveBeenCalledWith(expect.objectContaining({ product: better }));
  });

  it('explains positively when nothing beats the product', () => {
    const peer: EnrichedCatalogProduct = { ...base, id: 3, name: 'Aceite igual' };
    const signals = new Map<number, SwapSignals>([
      [1, richSignals],
      [3, richSignals],
    ]);
    renderScreen({ catalog: [base, peer], signals });
    expect(screen.getByText(/1 producto de su categoría y ninguno es mejor/)).toBeInTheDocument();
  });
});
