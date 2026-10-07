import { describe, expect, it } from 'vitest';

import { extractAdditiveMarkers, extractENumbers } from './additives';

describe('extractENumbers', () => {
  it('matches the hyphenated form', () => {
    expect(extractENumbers('estabilizante E-407')).toEqual(['407']);
  });

  it('matches the hyphen-less form', () => {
    expect(extractENumbers('contiene E407 y sal')).toEqual(['407']);
  });

  it('matches a letter suffix and deduplicates by numeric code', () => {
    expect(extractENumbers('E-339ii y E-339')).toEqual(['339']);
  });

  it('extracts every distinct E-number from a real Mercadona string', () => {
    expect(extractENumbers('estabilizantes (E-407, E-460, E-466 y E-339ii)')).toEqual([
      '407',
      '460',
      '466',
      '339',
    ]);
  });

  it('is case-insensitive', () => {
    expect(extractENumbers('contiene e407')).toEqual(['407']);
  });

  it('returns nothing when no E-number is present', () => {
    expect(extractENumbers('Aceite de oliva refinado')).toEqual([]);
  });
});

describe('extractAdditiveMarkers', () => {
  it('finds "aroma" and its plural from one canonical entry', () => {
    expect(extractAdditiveMarkers('aromas artificiales')).toContain('aroma');
  });

  it('matches markers accent-insensitively', () => {
    expect(extractAdditiveMarkers('almidón modificado de patata')).toContain('almidón modificado');
  });

  it('finds the multi-word phrase marker', () => {
    expect(extractAdditiveMarkers('potenciador del sabor E-621')).toContain('potenciador del sabor');
  });

  it('returns distinct markers, never duplicates', () => {
    const markers = extractAdditiveMarkers('con aroma y más aroma');
    expect(markers).toEqual(['aroma']);
  });

  it('returns nothing for a plain single-ingredient text', () => {
    expect(extractAdditiveMarkers('100% Pollo')).toEqual([]);
  });

  it('detects added sugar as a processing marker', () => {
    expect(extractAdditiveMarkers('leche desnatada y azúcar')).toContain('azúcar');
  });

  it('detects sugar syrups and isolated sugars', () => {
    expect(extractAdditiveMarkers('jarabe de glucosa y fructosa')).toEqual(
      expect.arrayContaining(['jarabe', 'glucosa', 'fructosa']),
    );
  });
});
