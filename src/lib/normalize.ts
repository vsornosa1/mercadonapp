/**
 * Normalises text for catalogue search: lower case, accents folded to their base
 * letters, whitespace collapsed.
 *
 * The same function must be applied to both the query and the indexed text.
 * Normalising only one side is the reason "platano" fails to find "Plátano" —
 * nobody types accents with one thumb in an aisle.
 */
export function normalizeText(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
