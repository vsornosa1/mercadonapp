import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { EnrichedCatalogProduct } from '../types/catalog.ts';
import type { Swap } from '../types/swaps.ts';
import { SwapList } from './SwapList.tsx';

const alt: EnrichedCatalogProduct = {
  id: 2,
  ean: '2',
  slug: 'x',
  name: 'Yogur natural',
  brand: '',
  categoryPath: [],
  leafCategoryId: 10,
  thumbnail: '',
  photo: '',
  unitPrice: 0.85,
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

const swaps: Swap[] = [
  {
    product: alt,
    score: 2,
    cost: null,
    reasons: [
      { kind: 'additives', from: 3, to: 0, detail: [] },
      { kind: 'protein', from: 3, to: 9 },
    ],
  },
];

describe('SwapList', () => {
  it('renders ranked alternatives with their benefits', () => {
    render(<SwapList result={{ kind: 'available', swaps }} onSelect={vi.fn()} />);
    expect(screen.getByText('Alternativas mejores')).toBeInTheDocument();
    expect(screen.getByText('Yogur natural')).toBeInTheDocument();
    expect(screen.getByText('Menos aditivos')).toBeInTheDocument();
    expect(screen.getByText('3 → 0')).toBeInTheDocument();
    expect(screen.getByText('Más proteína')).toBeInTheDocument();
    expect(screen.getByText('3 g → 9 g por 100 g')).toBeInTheDocument();
  });

  it('opens the recommended product when tapped', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<SwapList result={{ kind: 'available', swaps }} onSelect={onSelect} />);
    await user.click(screen.getByRole('button', { name: /Yogur natural/ }));
    expect(onSelect).toHaveBeenCalledWith(swaps[0]);
  });

  it('gives the button an accessible name that includes the benefits, not just the product', () => {
    render(<SwapList result={{ kind: 'available', swaps }} onSelect={vi.fn()} />);
    const button = screen.getByRole('button', { name: /Yogur natural/ });
    const name = button.getAttribute('aria-label') ?? '';
    // An aria-label overrides the element's contents, so the reasons have to be
    // part of the label or a screen-reader user never hears why it is better.
    expect(name).toMatch(/menos aditivos/i);
    expect(name).toMatch(/más proteína/i);
    expect(name).toMatch(/3 g → 9 g/);
  });
});

describe('SwapList — disclosed cost', () => {
  const withCost: Swap[] = [
    {
      product: alt,
      score: 2,
      cost: { kind: 'sugars', from: 12, to: 14 },
      reasons: [{ kind: 'tier', from: 'ultra-processed', to: 'whole' }],
    },
  ];

  it('shows the cost alongside the benefit, not instead of it', () => {
    render(<SwapList result={{ kind: 'available', swaps: withCost }} onSelect={vi.fn()} />);
    expect(screen.getByText('Menos procesado')).toBeInTheDocument();
    expect(screen.getByText('Más azúcar')).toBeInTheDocument();
    expect(screen.getByText('12 g → 14 g')).toBeInTheDocument();
  });

  it('renders no cost element when there is nothing to give up', () => {
    render(<SwapList result={{ kind: 'available', swaps }} onSelect={vi.fn()} />);
    expect(document.querySelector('.swap-item__cost')).toBeNull();
  });

  it('includes the cost in the accessible name, so it is not a visual-only caveat', () => {
    render(<SwapList result={{ kind: 'available', swaps: withCost }} onSelect={vi.fn()} />);
    const name = screen.getByRole('button', { name: /Yogur natural/ }).getAttribute('aria-label') ?? '';
    expect(name).toMatch(/a cambio/i);
    expect(name).toMatch(/más azúcar/i);
    expect(name).toMatch(/12 g → 14 g/);
  });

  it('omits the panel entirely for non-food — nutrition advice on shampoo is noise', () => {
    const { container } = render(<SwapList result={{ kind: 'non-food' }} onSelect={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('explains missing data instead of implying the product is good', () => {
    render(<SwapList result={{ kind: 'no-data' }} onSelect={vi.fn()} />);
    expect(screen.getByText(/no hay datos suficientes/i)).toBeInTheDocument();
  });

  it('gives positive feedback when nothing beats it, naming how many were compared', () => {
    render(<SwapList result={{ kind: 'none-better', comparedCount: 27 }} onSelect={vi.fn()} />);
    expect(screen.getByText(/27 productos de su categoría/i)).toBeInTheDocument();
    expect(screen.getByText(/ninguno es mejor/i)).toBeInTheDocument();
  });

  it('states the single-peer case in the singular, not "1 productos"', () => {
    render(<SwapList result={{ kind: 'none-better', comparedCount: 1 }} onSelect={vi.fn()} />);
    expect(screen.getByText(/1 producto de su categoría/i)).toBeInTheDocument();
  });
});
