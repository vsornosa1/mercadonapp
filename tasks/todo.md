# Task list: desktop layout, cart total, similar products

Plan: [plan.md](./plan.md)

## Task 1: Cart total in euros

**Description:** A pure `cartTotal(cart, products)` that sums the catalogue's
`unitPrice` for the products on the list, and reports what it could not price.

**Acceptance criteria:**
- [x] Sums `unitPrice` of every list item present in the catalogue
- [x] A product missing from the catalogue is excluded from the total and counted
- [x] Counts items sold by weight, whose price follows the weight the catalogue lists
- [x] An empty list totals zero even with a populated catalogue

**Verification:**
- [x] `npx vitest run src/lib/cart.test.ts`
- [x] `npm run typecheck`

**Dependencies:** None

**Files likely touched:** `src/lib/cart.ts`, `src/lib/cart.test.ts`,
`src/types/cart.ts`

**Estimated scope:** Small

## Task 2: Similar products

**Description:** A pure `findSimilar(product, catalog, excludeIds, limit)` that
returns comparable products from the same part of the shop.

**Acceptance criteria:**
- [x] Never returns the product itself or any excluded id
- [x] Prefers the same leaf category, and falls back to the same shelf
- [x] Works for non-food as well as food
- [x] Deterministic order for the same inputs
- [x] Respects the limit

**Verification:**
- [x] `npx vitest run src/lib/similar.test.ts`
- [x] `npm run typecheck`

**Dependencies:** None

**Files likely touched:** `src/lib/similar.ts`, `src/lib/similar.test.ts`

**Estimated scope:** Small

## Task 3: Layout detection hook

**Description:** `useMediaQuery(query)` so a composition can be chosen per
device instead of hidden with CSS.

**Acceptance criteria:**
- [x] Returns the current match and follows changes
- [x] Returns `false` when `matchMedia` does not exist, so tests are explicit
- [x] Unsubscribes on unmount

**Verification:**
- [x] `npx vitest run src/app/useMediaQuery.test.ts`

**Dependencies:** None

**Files likely touched:** `src/app/useMediaQuery.ts`, `src/app/useMediaQuery.test.ts`

**Estimated scope:** XS

## Checkpoint: After Tasks 1-3

- [x] `npm test` passes
- [x] `npm run typecheck` and `npm run lint` clean

## Task 4: App header with global search

**Description:** Move the search field into the app header, and give desktop a
horizontal navigation with the cart total beside the title.

**Acceptance criteria:**
- [x] On phone: title row plus a full-width search field
- [x] On desktop: one row with title, search, navigation and cart total
- [x] The field is labelled and reachable by keyboard on both layouts
- [x] Clearing the field returns to the section you were on

**Verification:**
- [x] `npx vitest run src/components/AppHeader.test.tsx`

**Dependencies:** Task 3

**Files likely touched:** `src/components/AppHeader.tsx`,
`src/components/AppHeader.test.tsx`, `src/styles.css`

**Estimated scope:** Medium

## Task 5: Navigation without the redundant search tab

**Description:** Reduce the tabs to the sections that are destinations, and carry
the cart total.

**Acceptance criteria:**
- [x] Tabs are Sections and List
- [x] The active tab is marked `aria-current="page"`
- [x] The List tab's accessible name includes the count and the total

**Verification:**
- [x] `npx vitest run src/components/BottomNav.test.tsx`

**Dependencies:** Task 1

**Files likely touched:** `src/components/BottomNav.tsx`,
`src/components/BottomNav.test.tsx`

**Estimated scope:** Small

## Task 6: App shell

**Description:** Lift the query into `App` and resolve the view in one ordered
decision: an open product, then a search in progress, then the active tab.

**Acceptance criteria:**
- [x] Typing from any tab shows results; clearing returns to that tab
- [x] Opening a product hides the navigation; going back restores it
- [x] View changes move focus to the content

**Verification:**
- [x] `npx vitest run src/app/App.test.tsx`

**Dependencies:** Tasks 3, 4, 5, 7

**Files likely touched:** `src/app/App.tsx`, `src/app/App.test.tsx`

**Estimated scope:** Medium

## Checkpoint: After Tasks 4-6

- [x] Navigation and global search covered by tests
- [x] `npm test` passes

## Task 7: Search results view

**Description:** `SearchResults` takes the query as a prop and renders matches;
the field itself now lives in the header.

**Acceptance criteria:**
- [x] Reports the true number of matches, pluralised
- [x] Explains an empty result with the term that found nothing
- [x] Paginates, and returns to page 1 when the term changes

**Verification:**
- [x] `npx vitest run src/app/SearchResults.test.tsx`

**Dependencies:** None

**Files likely touched:** `src/app/SearchResults.tsx`,
`src/app/SearchResults.test.tsx`

**Estimated scope:** Small

## Task 8: Browse, two layouts

**Description:** Keep the phone drill-down; give desktop a section rail with the
shelves or products beside it.

**Acceptance criteria:**
- [x] Phone: sections, then shelves, then products, with a breadcrumb
- [x] Desktop: all sections visible at once, content beside the rail
- [x] Counts on both layouts equal the list they open

**Verification:**
- [x] `npx vitest run src/app/BrowseScreen.test.tsx`

**Dependencies:** Task 3

**Files likely touched:** `src/app/BrowseScreen.tsx`,
`src/components/CategoryBrowser.tsx`, `src/styles.css`

**Estimated scope:** Medium

## Task 9: Product page and recommendations

**Description:** Two columns on desktop, and a Similares panel under the better
alternatives.

**Acceptance criteria:**
- [x] Better alternatives render before similares
- [x] No product appears in both panels
- [x] Similares appears for non-food, where health advice does not apply
- [x] The primary action stays reachable in both layouts

**Verification:**
- [x] `npx vitest run src/app/ProductScreen.test.tsx src/components/SimilarList.test.tsx`

**Dependencies:** Task 2

**Files likely touched:** `src/app/ProductScreen.tsx`,
`src/components/SimilarList.tsx`, `src/styles.css`

**Estimated scope:** Medium

## Task 10: Cart total on screen

**Description:** Show the list's total: a sticky bar on phone, a summary card
beside the list on desktop. Both disclose the one-of-each assumption.

**Acceptance criteria:**
- [x] Total formatted as Spanish currency
- [x] Assumption disclosed, with the by-weight caveat when it applies
- [x] Unavailable products are excluded and mentioned
- [x] Empty list shows no total

**Verification:**
- [x] `npx vitest run src/app/CartScreen.test.tsx`

**Dependencies:** Task 1

**Files likely touched:** `src/app/CartScreen.tsx`, `src/components/CartSummary.tsx`,
`src/styles.css`

**Estimated scope:** Medium

## Checkpoint: After Tasks 7-10

- [x] Full suite and build pass
- [x] Browser pass at 375 px, 840 px and 1280 px
- [x] No horizontal overflow at any of them
- [x] Contrast audit clean on every screen in both layouts
- [x] Review with the human before committing

## Task 11: Record the decisions

**Description:** The specs currently forbid what we just built.

**Acceptance criteria:**
- [x] SPEC-cart.md: totals in scope, quantities still "ask first"
- [x] SPEC-alternatives.md: the similares panel and the recommendation order
- [x] SPEC-nutrition/catalog untouched

**Verification:**
- [x] Read the two files back

**Dependencies:** Tasks 1, 2

**Files likely touched:** `.agents/docs/intent/SPEC-cart.md`,
`.agents/docs/intent/SPEC-alternatives.md`

**Estimated scope:** XS

## Task 12: Remove what the rewrite left dead

**Description:** CSS and components orphaned by the new shell.

**Acceptance criteria:**
- [x] No rule left for a class nothing renders
- [x] `npm run lint` clean, build size not grown

**Verification:**
- [x] `npm run lint`, `npm run build`

**Dependencies:** Tasks 4-10

**Files likely touched:** `src/styles.css`

**Estimated scope:** Small

## Checkpoint: Complete

- [x] Every acceptance criterion met
- [x] Ready for review
