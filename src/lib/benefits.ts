import type { Reason } from '../types/swaps.ts';
import { formatNutrientValue } from './format.ts';

export interface Benefit {
  label: string;
  delta: string;
  direction: 'up' | 'down';
}

/**
 * Turns a ranking reason into displayable benefit data. The label carries the
 * meaning in words ("Más proteína"), so the arrow glyph is decoration rather
 * than the only signal — colour and direction alone would not be accessible.
 *
 * Numbers go through `formatNutrientValue` because the underlying Open Food
 * Facts values are long floats (0.198 g of salt should read "0,2 g").
 */
export function toBenefit(reason: Reason): Benefit {
  const grams = (value: number) => formatNutrientValue(value, 'g');

  switch (reason.kind) {
    case 'protein':
      return {
        label: 'Más proteína',
        delta: `${grams(reason.from)} g → ${grams(reason.to)} g por 100 g`,
        direction: 'up',
      };
    case 'sugars':
      return {
        label: 'Menos azúcar',
        delta: `${grams(reason.from)} g → ${grams(reason.to)} g`,
        direction: 'down',
      };
    case 'salt':
      return {
        label: 'Menos sal',
        delta: `${grams(reason.from)} g → ${grams(reason.to)} g`,
        direction: 'down',
      };
    case 'additives':
      return {
        label: 'Menos aditivos',
        delta: `${reason.from} → ${reason.to}`,
        direction: 'down',
      };
    case 'nova':
      return {
        label: 'Menos procesado',
        delta: `NOVA ${reason.from} → ${reason.to}`,
        direction: 'down',
      };
  }
}
