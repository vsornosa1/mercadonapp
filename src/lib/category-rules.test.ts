import { describe, expect, it } from 'vitest';

import { categoryRuleSignal } from './category-rules';

describe('categoryRuleSignal', () => {
  it('classifies a whole-food category as whole, via the category rule', () => {
    expect(categoryRuleSignal(['Fruta', 'Plátano y uva'])).toEqual({
      basis: 'category-rule',
      tier: 'whole',
      additiveMarkers: [],
    });
  });

  it('covers the whole-food counters', () => {
    for (const name of ['Pescado fresco', 'Marisco', 'Cerdo', 'Vacuno', 'Aves y pollo', 'Huevos']) {
      expect(categoryRuleSignal([name])?.tier, name).toBe('whole');
    }
  });

  it('leaves prepared counters unknown — silence about their ingredients proves nothing', () => {
    expect(categoryRuleSignal(['Pan de horno', 'Pan de molde'])?.tier).toBe('unknown');
    expect(categoryRuleSignal(['Bollería de horno'])?.tier).toBe('unknown');
    expect(categoryRuleSignal(['Listo para Comer'])?.tier).toBe('unknown');
    expect(categoryRuleSignal(['Embutido'])?.tier).toBe('unknown');
  });

  it('returns null for a category outside the reviewed table', () => {
    expect(categoryRuleSignal(['Limpieza y hogar', 'Lejía'])).toBeNull();
  });

  it('prefers whole over unknown if a lineage somehow matches both', () => {
    expect(categoryRuleSignal(['Fruta', 'Pan de horno'])?.tier).toBe('whole');
  });
});
