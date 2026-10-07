import type { ProcessingTier } from '../types/nutrition.ts';
import type { Reason, TradeOff } from '../types/swaps.ts';
import { formatNutrientValue } from './format.ts';

export interface Benefit {
  label: string;
  delta: string;
  direction: 'up' | 'down';
}

/** Generic processing words, deliberately not NOVA's vocabulary. */
const TIER_WORD: Record<ProcessingTier, string> = {
  whole: 'entero',
  processed: 'procesado',
  'ultra-processed': 'ultraprocesado',
  unknown: 'sin datos',
};

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
    case 'tier':
      return {
        label: 'Menos procesado',
        delta: `De ${TIER_WORD[reason.from]} a ${TIER_WORD[reason.to]}`,
        direction: 'down',
      };
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

export interface Cost {
  label: string;
  delta: string;
}

/**
 * Turns a disclosed trade-off into display text, stated from the user's point
 * of view: if the recommended product has more sugar, the cost reads "Más
 * azúcar" — never the improvement's framing.
 *
 * Only macros can be traded off, so there is no tier/additive case here.
 */
export function toCost(tradeOff: TradeOff): Cost {
  const grams = (value: number) => `${formatNutrientValue(value, 'g')} g`;

  switch (tradeOff.kind) {
    case 'protein':
      return {
        label: 'Menos proteína',
        delta: `${grams(tradeOff.from)} → ${grams(tradeOff.to)} por 100 g`,
      };
    case 'sugars':
      return {
        label: 'Más azúcar',
        delta: `${grams(tradeOff.from)} → ${grams(tradeOff.to)}`,
      };
    case 'salt':
      return {
        label: 'Más sal',
        delta: `${grams(tradeOff.from)} → ${grams(tradeOff.to)}`,
      };
  }
}
