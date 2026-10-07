import type { ProcessingSignal } from '../types/nutrition.ts';

// Hand-reviewed table: barcode-less fresh products get a tier from their
// category, because their store PLU codes will never resolve in Open Food
// Facts and they publish no ingredient text. This is data, not code — changing
// it is a visible, reviewable diff (see category-rules.test.ts).

const WHOLE_FOOD_CATEGORIES: ReadonlySet<string> = new Set([
  'Fruta',
  'Verdura',
  'Lechuga y ensalada preparada',
  'Pescado fresco',
  'Marisco',
  'Cerdo',
  'Vacuno',
  'Aves y pollo',
  'Conejo y cordero',
  'Huevos',
]);

const PREPARED_CATEGORIES: ReadonlySet<string> = new Set([
  'Pan de horno',
  'Bollería de horno',
  'Listo para Comer',
  'Embutido',
  'Embutido curado',
]);

/**
 * Returns a category-rule processing signal when the product's lineage lands in
 * the reviewed table, otherwise null. Whole wins over unknown on an ambiguity.
 * A product with an EAN never reaches this path — the EAN path always wins.
 */
export function categoryRuleSignal(categoryNames: readonly string[]): ProcessingSignal | null {
  if (categoryNames.some((name) => WHOLE_FOOD_CATEGORIES.has(name))) {
    return { basis: 'category-rule', tier: 'whole', additiveMarkers: [] };
  }
  if (categoryNames.some((name) => PREPARED_CATEGORIES.has(name))) {
    return { basis: 'category-rule', tier: 'unknown', additiveMarkers: [] };
  }
  return null;
}
