import type { ProcessingBasis, ProcessingTier } from '../types/nutrition.ts';

/**
 * The badge states **the strongest claim the evidence supports**.
 *
 * NOVA vocabulary is used only when NOVA actually produced the tier. When our
 * own ingredient heuristic did, the label describes what it measured — additive
 * content — because calling a product "alimento entero" on the strength of an
 * additive scan is a processing claim we have not earned. "Café en cápsula"
 * (`100% café molido`) is the case that proved it: additive-free, and labelled
 * as a whole food.
 */
export function tierLabel(tier: ProcessingTier, basis: ProcessingBasis): string {
  if (tier === 'unknown') return 'Sin datos';

  if (basis === 'off-nova') {
    return tier === 'whole' ? 'Poco procesado' : tier === 'processed' ? 'Procesado' : 'Ultraprocesado';
  }

  if (basis === 'category-rule') {
    return tier === 'whole' ? 'Fresco' : 'Sin datos';
  }

  return tier === 'whole' ? 'Sin aditivos' : tier === 'processed' ? 'Con aditivos' : 'Muchos aditivos';
}

/** The plain-language name of the evidence behind a tier. */
export function basisLabel(basis: ProcessingBasis): string {
  switch (basis) {
    case 'off-nova':
      return 'Clasificación NOVA';
    case 'ingredient-heuristic':
      return 'según ingredientes';
    case 'category-rule':
      return 'por categoría';
  }
}
