# Implementation Plan: Deliberate desktop layout, cart total, and similar products

## Overview

Three asks, one theme — the interface should be aimed at each device on purpose
instead of being one phone layout stretched across every screen.

1. **Two deliberate layouts.** A phone layout (bottom tabs, single column, thumb
   reach) and a desktop layout (app bar with global search, left category rail,
   two-column product page, sidebar summaries), switched at `48rem`. Today there
   is one column capped at `40rem` with a bottom nav on every width, so at
   ~840 px — the width in the annotated screenshot — the app is still a phone UI.
2. **Cart total in €.** The list answers "how much is this basket".
3. **Similar products**, and better alternatives ranked *first* among
   recommendations.

## Architecture Decisions

- **Desktop is a separate composition, not a wider phone.** A `useMediaQuery`
  hook picks the composition, so each layout is honest about what it is instead
  of hiding one behind CSS that leaves a duplicate accessibility tree.
- **The search field becomes global; the "Buscar" tab is removed.** The field is
  visible on every screen, so a tab that navigates to a second copy of the same
  control is a redundant stop. Typing is a *mode* (results), not a destination.
  This is what the crossed-out "Buscar" in the annotated screenshot asks for.
  View resolution becomes explicit and ordered: product > query > tab.
- **The cart total is derived, never stored.** `cartTotal()` sums `unitPrice`,
  which the catalogue gives as the real price of one purchase unit (`1 l` milk,
  `1,07 kg` of pears). No schema change, no new `quantity` field: SPEC-cart
  rules quantities "ask first", and the total is useful without them. A
  `quantity` field, if ever added, multiplies into the same function.
- **The total discloses its assumption.** It is "one of each", and items sold by
  weight are priced at the amount the catalogue lists. Saying so is the same
  standard we hold nutrition figures to.
- **"Similares" is not a health claim.** Better alternatives stay a food-only,
  evidence-gated panel; similares is a neutral "same shelf, like this one" list
  that also works for shampoo — and it is exactly what a product with *no*
  better alternative previously had nothing of.
- **Recommendations are ordered, not merged.** Better alternatives first (they
  answer "can I do better?"), similares after (they answer "what else is here?").
  The panels never repeat a product.

## Task List

### Phase 1: Foundations (pure logic, TDD)

- [ ] Task 1: `cartTotal(cart, products)` in `src/lib/cart.ts` — total, priced
      count, missing products, variable-weight count. Tests first.
- [ ] Task 2: `findSimilar(product, catalog, excludeIds, limit)` in
      `src/lib/similar.ts` — same leaf, then same shelf; deterministic order.
      Tests first.
- [ ] Task 3: `useMediaQuery(query)` in `src/app/useMediaQuery.ts` — safe when
      `matchMedia` is absent (jsdom), so tests opt in explicitly.

### Checkpoint: Foundations
- [ ] `npm test`, `npm run typecheck`, `npm run lint` clean

### Phase 2: Shell and navigation

- [ ] Task 4: `AppHeader` — one row on desktop (title, global search, nav,
      cart total); two rows on phone (title, search). Replaces the inline header.
- [ ] Task 5: `BottomNav` reduced to `browse | cart`; carries the cart total in
      the Lista tab's accessible name.
- [ ] Task 6: `App` shell — query lifted to `App`, ordered view resolution,
      nav hidden while a product is open.

### Checkpoint: Shell
- [ ] Navigation and global search covered by tests

### Phase 3: Screens

- [ ] Task 7: `SearchResults` (replaces `SearchScreen`) — takes `query`, renders
      results. The idle "type to search" state moves to the header field.
- [ ] Task 8: `BrowseScreen` — phone drill-down kept; desktop gets a section
      rail with the content beside it.
- [ ] Task 9: `ProductScreen` — two columns on desktop; `Similares` panel under
      `Alternativas mejores`, never repeating a recommended product.
- [ ] Task 10: `CartScreen` — total summary: sticky bar on phone, sidebar card
      on desktop.

### Checkpoint: Screens
- [ ] Full suite, build, and a browser pass at 375 px, 840 px and 1280 px
- [ ] Contrast audit clean on every screen at both layouts

### Phase 4: Cleanup and documentation

- [ ] Task 11: SPEC-cart.md records totals as in scope; SPEC-alternatives.md
      records the similares panel and the recommendation order.
- [ ] Task 12: remove CSS left dead by the rewrite; commit.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Breakpoint switch changes what a test renders | Medium | `useMediaQuery` returns phone when `matchMedia` is missing; tests stub it to choose a layout |
| Two compositions drift apart | Medium | Both share the leaf components (rows, pager, states); only the arrangement is duplicated |
| A cart total that implies more precision than we have | High | Disclose "one of each" and the by-weight caveat in the UI, not just the code |
| Similares crowding out the honest alternatives panel | Low | Alternatives render first and are never truncated by similares |

## Open Questions

- **Quantities.** The total assumes one of each, which keeps the cart a
  checklist. Quantity steppers would make it a true basket total but change the
  cart model (SPEC-cart: ask first). Asked at the end of this work.
- The trip-order initiative (`SPEC-zones.md`, `SPEC-ordering.md`) is approved but
  still owes its own task list; this plan does not cover it.
- Version: this is a feature release → `1.1.0` rather than `1.0.1`.
