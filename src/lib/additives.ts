import { normalizeText } from './normalize.ts';

interface Marker {
  display: string;
  norm: string;
}

// Canonical additive-class words. Singular stems match their plurals; the
// norm form is accent-folded so matching works against ingredient text.
const MARKERS: Marker[] = [
  'aroma',
  'colorante',
  'conservador',
  'estabilizante',
  'espesante',
  'emulgente',
  'edulcorante',
  'antioxidante',
  'gasificante',
  'potenciador del sabor',
  'almidón modificado',
].map((display) => ({ display, norm: normalizeText(display) }));

/**
 * Distinct E-number numeric codes found in an ingredient string. Handles
 * "E-407", "E407", lowercase, and letter suffixes ("E-339ii"), deduplicating
 * by numeric core so "E-339" and "E-339ii" count once.
 */
export function extractENumbers(html: string): string[] {
  const matches = html.match(/e-?\d{3,4}[a-z]*/gi) ?? [];
  const codes = new Set<string>();
  for (const match of matches) {
    // The regex guarantees at least three digits, so this is always non-empty.
    codes.add(match.replace(/[^0-9]/g, ''));
  }
  return [...codes];
}

/** Distinct additive-class markers present in the ingredient string, in display form. */
export function extractAdditiveMarkers(html: string): string[] {
  const text = normalizeText(html);
  const found: string[] = [];
  for (const marker of MARKERS) {
    if (text.includes(marker.norm)) found.push(marker.display);
  }
  return found;
}
