import { describe, expect, it } from 'vitest';

import { classifyProcessing } from './processing';

describe('classifyProcessing', () => {
  it('returns unknown when no ingredient text is published', () => {
    expect(classifyProcessing(null)).toEqual({
      basis: 'ingredient-heuristic',
      tier: 'unknown',
      additiveMarkers: [],
    });
  });

  it('returns unknown for empty ingredient text — absence proves nothing', () => {
    expect(classifyProcessing('')).toEqual({
      basis: 'ingredient-heuristic',
      tier: 'unknown',
      additiveMarkers: [],
    });
  });

  it('returns whole for a text with no E-numbers and no markers', () => {
    expect(classifyProcessing('Aceite de oliva refinado y virgen extra').tier).toBe('whole');
  });

  it('returns processed for a single E-number', () => {
    expect(classifyProcessing('estabilizante E-407').tier).toBe('processed');
  });

  it('returns processed for a single marker with no E-number', () => {
    expect(classifyProcessing('con aroma natural').tier).toBe('processed');
  });

  it('returns ultra-processed for three or more E-numbers', () => {
    expect(classifyProcessing('E-407, E-460, E-466').tier).toBe('ultra-processed');
  });

  it('returns ultra-processed for two or more markers', () => {
    expect(classifyProcessing('aroma y estabilizante').tier).toBe('ultra-processed');
  });

  it('carries the marker words so the claim can be shown', () => {
    expect(classifyProcessing('con aroma y colorante').additiveMarkers).toEqual([
      'aroma',
      'colorante',
    ]);
  });
});
