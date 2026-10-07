import { describe, expect, it } from 'vitest';

import { toBenefit } from './benefits.ts';

describe('toBenefit', () => {
  it('describes more protein as a gain, with per-100g units', () => {
    expect(toBenefit({ kind: 'protein', from: 4.8, to: 10 })).toEqual({
      label: 'Más proteína',
      delta: '4,8 g → 10 g por 100 g',
      direction: 'up',
    });
  });

  it('describes fewer sugars as a reduction', () => {
    expect(toBenefit({ kind: 'sugars', from: 18, to: 3.6 })).toEqual({
      label: 'Menos azúcar',
      delta: '18 g → 3,6 g',
      direction: 'down',
    });
  });

  it('describes fewer additives with counts only', () => {
    expect(toBenefit({ kind: 'additives', from: 3, to: 0, detail: ['407'] })).toEqual({
      label: 'Menos aditivos',
      delta: '3 → 0',
      direction: 'down',
    });
  });

  it('describes a lower NOVA group as less processed', () => {
    expect(toBenefit({ kind: 'nova', from: 4, to: 1 })).toEqual({
      label: 'Menos procesado',
      delta: 'NOVA 4 → 1',
      direction: 'down',
    });
  });

  it('describes less salt as a reduction', () => {
    expect(toBenefit({ kind: 'salt', from: 0.2, to: 0.1 })).toEqual({
      label: 'Menos sal',
      delta: '0,2 g → 0,1 g',
      direction: 'down',
    });
  });

  it('keeps the label free of directional glyphs — the icon is decoration, the text carries meaning', () => {
    for (const reason of [
      { kind: 'protein', from: 1, to: 2 },
      { kind: 'sugars', from: 2, to: 1 },
    ] as const) {
      expect(toBenefit(reason).label).not.toMatch(/[↑↓+]/);
    }
  });

  it('rounds the delta numbers — Open Food Facts salt values are long floats', () => {
    expect(toBenefit({ kind: 'salt', from: 0.26, to: 0.198 }).delta).toBe('0,26 g → 0,2 g');
  });

  it('rounds a long macro float to one decimal', () => {
    expect(toBenefit({ kind: 'protein', from: 4.8048048048048, to: 10.555 }).delta).toBe(
      '4,8 g → 10,6 g por 100 g',
    );
  });
});
