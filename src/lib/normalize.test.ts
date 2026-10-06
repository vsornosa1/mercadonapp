import { describe, expect, it } from 'vitest';

import { normalizeText } from './normalize';

describe('normalizeText', () => {
  it('lowercases and de-accents so a query typed without accents matches the catalogue', () => {
    expect(normalizeText('Plátano de Canarias')).toBe('platano de canarias');
  });

  it('normalises query and index identically — normalising only one side is the classic accent bug', () => {
    expect(normalizeText('Atún')).toBe(normalizeText('atun'));
  });

  it('folds tilde-n to plain n so "manana" is reachable as "mañana"', () => {
    expect(normalizeText('mañana')).toBe('manana');
  });

  it('folds diaeresis so "pingüino" is reachable as "pinguino"', () => {
    expect(normalizeText('pingüino')).toBe('pinguino');
  });

  it('trims and collapses internal whitespace', () => {
    expect(normalizeText('  Plátano   de  Canarias  ')).toBe('platano de canarias');
  });

  it('leaves digits and hyphens intact, because additive codes like E-407 are searchable tokens', () => {
    expect(normalizeText('E-407')).toBe('e-407');
  });

  it('returns an empty string for whitespace-only input rather than throwing', () => {
    expect(normalizeText('   ')).toBe('');
  });
});
