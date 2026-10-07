import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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

describe('SwapList', () => {
  it('says plainly when there is no better alternative', () => {
    render(<SwapList swaps={[]} />);
    expect(screen.getByText('No hemos encontrado una alternativa mejor.')).toBeInTheDocument();
  });

  it('renders ranked alternatives with their numeric reasons', () => {
    const swaps: Swap[] = [
      {
        product: alt,
        score: 2,
        reasons: [
          { kind: 'additives', from: 3, to: 0, detail: [] },
          { kind: 'protein', from: 3, to: 9 },
        ],
      },
    ];
    render(<SwapList swaps={swaps} />);

    expect(screen.getByText('Alternativas mejores')).toBeInTheDocument();
    expect(screen.getByText('Yogur natural')).toBeInTheDocument();
    expect(screen.getByText('menos aditivos (3 → 0)')).toBeInTheDocument();
    expect(screen.getByText('más proteína (3 g → 9 g por 100 g)')).toBeInTheDocument();
  });
});
