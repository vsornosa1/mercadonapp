import type { ProcessingSignal } from '../types/nutrition';
import { extractAdditiveMarkers, extractENumbers } from './additives';

/**
 * Classifies a product's processing tier from its ingredient text.
 *
 * This is OUR heuristic, not NOVA: it reasons over the E-numbers and
 * additive-class words Mercadona publishes. Missing text is "unknown" — the
 * absence of an ingredient list is not evidence of wholesomeness.
 */
export function classifyProcessing(ingredientsHtml: string | null): ProcessingSignal {
  if (!ingredientsHtml || ingredientsHtml.trim() === '') {
    return { basis: 'ingredient-heuristic', tier: 'unknown', additiveMarkers: [] };
  }

  const eCount = extractENumbers(ingredientsHtml).length;
  const markers = extractAdditiveMarkers(ingredientsHtml);
  const markerCount = markers.length;

  let tier: ProcessingSignal['tier'];
  if (eCount >= 3 || markerCount >= 2) tier = 'ultra-processed';
  else if (eCount >= 1 || markerCount >= 1) tier = 'processed';
  else tier = 'whole';

  return { basis: 'ingredient-heuristic', tier, additiveMarkers: markers };
}
