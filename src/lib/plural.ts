/**
 * Spanish pluralisation for counted nouns: `pluralise(1, 'producto', 'productos')`
 * is "1 producto", `pluralise(25, …)` is "25 productos".
 *
 * Spanish takes the **plural for zero** ("0 productos"), so the test is `=== 1`
 * rather than a truthiness check — the rule is easy to break by accident when
 * written inline at each call site.
 */
export function pluralise(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
