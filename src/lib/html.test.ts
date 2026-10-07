import { describe, expect, it } from 'vitest';

import { stripHtml } from './html';

describe('stripHtml', () => {
  it('removes tags and collapses whitespace to readable text', () => {
    expect(stripHtml('<p>Ingredientes: <strong>leche</strong> y azúcar.</p>')).toBe(
      'Ingredientes: leche y azúcar.',
    );
  });

  it('decodes the common HTML entities', () => {
    expect(stripHtml('harina &amp; agua')).toBe('harina & agua');
    expect(stripHtml('aceite&nbsp;de oliva')).toBe('aceite de oliva');
  });

  it('returns an empty string for empty input', () => {
    expect(stripHtml('')).toBe('');
  });
});
