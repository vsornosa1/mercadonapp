import { describe, expect, it } from 'vitest';

import { tierLabel, basisLabel } from './tier-labels.ts';

describe('tierLabel', () => {
  it('uses NOVA vocabulary only when NOVA is what produced the tier', () => {
    expect(tierLabel('whole', 'off-nova')).toBe('Poco procesado');
    expect(tierLabel('processed', 'off-nova')).toBe('Procesado');
    expect(tierLabel('ultra-processed', 'off-nova')).toBe('Ultraprocesado');
  });

  it('describes the ADDITIVE finding when our heuristic produced the tier', () => {
    // The defect this fixes: "Café en cápsula" (100% café molido, no additives)
    // was labelled "Alimento entero" — a NOVA-1-sounding claim from a heuristic
    // that only measured additives. The label must state what was measured.
    expect(tierLabel('whole', 'ingredient-heuristic')).toBe('Sin aditivos');
    expect(tierLabel('processed', 'ingredient-heuristic')).toBe('Con aditivos');
    expect(tierLabel('ultra-processed', 'ingredient-heuristic')).toBe('Muchos aditivos');
  });

  it('calls a category-rule whole food fresh, not "alimento entero"', () => {
    expect(tierLabel('whole', 'category-rule')).toBe('Fresco');
    expect(tierLabel('unknown', 'category-rule')).toBe('Sin datos');
  });

  it('says "sin datos" whenever the tier is unknown, whatever the basis', () => {
    expect(tierLabel('unknown', 'off-nova')).toBe('Sin datos');
    expect(tierLabel('unknown', 'ingredient-heuristic')).toBe('Sin datos');
  });

  it('never claims NOVA for a non-NOVA basis', () => {
    for (const basis of ['ingredient-heuristic', 'category-rule'] as const) {
      for (const tier of ['whole', 'processed', 'ultra-processed'] as const) {
        expect(tierLabel(tier, basis).toLowerCase()).not.toContain('procesado');
      }
    }
  });
});

describe('basisLabel', () => {
  it('names the evidence behind the tier', () => {
    expect(basisLabel('off-nova')).toBe('Clasificación NOVA');
    expect(basisLabel('ingredient-heuristic')).toBe('según ingredientes');
    expect(basisLabel('category-rule')).toBe('por categoría');
  });
});
