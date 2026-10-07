import type { EnrichedCatalogProduct } from './catalog.ts';
import type { ProcessingTier } from './nutrition.ts';

export type Reason =
  | { kind: 'tier'; from: ProcessingTier; to: ProcessingTier }
  | { kind: 'additives'; from: number; to: number; detail: string[] }
  | { kind: 'nova'; from: 1 | 2 | 3 | 4; to: 1 | 2 | 3 | 4 }
  | { kind: 'protein'; from: number; to: number } // g per 100 g
  | { kind: 'sugars'; from: number; to: number }
  | { kind: 'salt'; from: number; to: number };

/**
 * The single macro dimension on which a recommendation gives something up.
 * Shown to the user with the same weight as the benefit — a swap with a hidden
 * cost is worse than no swap at all.
 *
 * Only macros can appear here: a processing regression (tier, additives, NOVA)
 * disqualifies a candidate outright, so it is never a trade-off.
 */
export type MacroReasonKind = Extract<Reason['kind'], 'protein' | 'sugars' | 'salt'>;

export interface TradeOff {
  kind: MacroReasonKind;
  from: number;
  to: number;
}

export interface Swap {
  product: EnrichedCatalogProduct; // enriched: the UI renders its tier badge
  reasons: Reason[]; // never empty — a swap with no reason is not a swap
  cost: TradeOff | null; // at most one, disclosed
  score: number;
}
