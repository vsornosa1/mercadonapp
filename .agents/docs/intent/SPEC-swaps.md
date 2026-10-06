# Spec: `swaps`

Module id: `swaps` · Depends on: `nutrition`, `catalog` · Build order: 4th (last)

## Objective

For a product, name a similar product that is better — with the reason attached, in numbers.

This is the feature the app exists for. It is built last on purpose: it is worthless until the data underneath it is real.

## Output contract

```ts
type Reason =
  | { kind: 'additives'; from: number; to: number; detail: string[] }
  | { kind: 'nova'; from: 1 | 2 | 3 | 4; to: 1 | 2 | 3 | 4 }
  | { kind: 'protein'; from: number; to: number }   // g per 100 g
  | { kind: 'sugars'; from: number; to: number }
  | { kind: 'salt'; from: number; to: number };

interface Swap {
  product: CatalogProduct;
  reasons: Reason[];   // never empty — a swap with no reason is not a swap
  score: number;
}

// Pure. No fetching, no React, no globals. Deterministic for the same inputs.
function findSwaps(
  product: CatalogProduct,
  catalog: readonly CatalogProduct[],
  nutrition: NutritionIndex,
  limit?: number,        // default 3
): Swap[];
```

## Ranking rules

1. **Scope:** candidates share the product's `leafCategoryId` and are not the product itself. Same category is the whole basis of "similar" — comparing a yogurt to a chorizo is advice, not a swap.
2. **Comparability:** a candidate must have data that can be compared on the reason being claimed. A candidate with no nutrition at all cannot win on protein, and must not.
3. **Prefer, in order:** lower additive count → better Nova group → more protein per 100 g → less sugar → less salt.
4. **Strictly better only.** A candidate is returned only if at least one reason holds *and* no returned reason is worse. If nothing is strictly better, return `[]` — an empty result is a valid, honest answer and the UI must say "no hemos encontrado una alternativa mejor", not pad the list with near-identical items.
5. Ties are broken by product id, so the output is deterministic and testable.

## Presentation

- Reasons use the actual numbers: `menos aditivos (3 → 0)`, `más proteína (5 g → 12 g por 100 g)`, `menos azúcar (14 g → 4 g)`.
- Claims are **relative, never absolute**: the app says "better than what's in your cart", never "healthy". No traffic-light badge, no score presented as an authority.
- If `tier` is `unknown` for either side, no processing claim is made on that pair.

## Acceptance criteria

1. `findSwaps` is pure and deterministic; identical inputs return deeply identical output.
2. Every returned `Swap` has ≥ 1 reason, and each reason's `from`/`to` values match the underlying data exactly (asserted by test, not by eye).
3. Candidates outside the leaf category are never returned.
4. When nothing is strictly better, `[]` is returned — covered by an explicit test with a hand-built category.
5. Products with `source: 'none'` nutrition are never ranked on macros.
6. `unknown` processing never produces a processing reason.
7. No network access; the function takes everything as arguments.
8. Unit tests cover: empty category, single-item category, all-worse candidates, a tie between two equally good candidates, and a candidate missing one macro but better on another.

## Boundaries

**Always** — attach the reason to the recommendation; show the ingredient text behind an additive claim; keep the function pure so it can be tested without a browser.

**Ask first** — changing the preference order in rule 3; allowing cross-category suggestions; adding any notion of a composite health score.

**Never** — invent a scoring scale presented as authoritative (no home-made "health score" out of 100); recommend a product whose data we don't have; recommend something that is only better on one axis and worse on another while presenting it as "better".

## Open questions

1. **Same-category only** — my assumption, raised at intent stage and still unconfirmed. Cross-category swaps (e.g. swapping a processed snack for fruit) would be a different, larger feature.
2. **Variable-weight products** — comparing €/kg fresh produce on macros is ill-defined. Recommendation: exclude `isVariableWeight` products from swap *candidates* unless the comparison rests on ingredients only.
3. **Protein and muscle goal** — protein is weighted as a positive because the stated goal is holding/gaining muscle. Confirm that "more protein per 100 g" is genuinely a win for you rather than a proxy I've assumed.
