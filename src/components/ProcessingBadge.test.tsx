import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProcessingBadge } from './ProcessingBadge.tsx';

describe('ProcessingBadge', () => {
  it('shows the additive finding, not a whole-food claim, when only ingredients were inspected', () => {
    render(<ProcessingBadge signal={{ basis: 'ingredient-heuristic', tier: 'whole', additiveMarkers: [] }} />);
    expect(screen.getByText('Sin aditivos')).toBeInTheDocument();
    expect(screen.queryByText('Alimento entero')).not.toBeInTheDocument();
  });

  it('names its evidence so a heuristic is never mistaken for NOVA', () => {
    render(<ProcessingBadge signal={{ basis: 'ingredient-heuristic', tier: 'whole', additiveMarkers: [] }} />);
    expect(screen.getByText('según ingredientes')).toBeInTheDocument();
  });

  it('uses NOVA vocabulary when NOVA produced the tier', () => {
    render(<ProcessingBadge signal={{ basis: 'off-nova', tier: 'ultra-processed', additiveMarkers: [] }} />);
    expect(screen.getByText('Ultraprocesado')).toBeInTheDocument();
    expect(screen.getByText('Clasificación NOVA')).toBeInTheDocument();
  });

  it('calls a category-rule whole food fresh', () => {
    render(<ProcessingBadge signal={{ basis: 'category-rule', tier: 'whole', additiveMarkers: [] }} />);
    expect(screen.getByText('Fresco')).toBeInTheDocument();
    expect(screen.getByText('por categoría')).toBeInTheDocument();
  });

  it('omits the basis for an unknown tier — there is no claim to attribute', () => {
    render(<ProcessingBadge signal={{ basis: 'ingredient-heuristic', tier: 'unknown', additiveMarkers: [] }} />);
    expect(screen.getByText('Sin datos')).toBeInTheDocument();
    expect(screen.queryByText('según ingredientes')).not.toBeInTheDocument();
  });
});
