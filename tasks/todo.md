# Task list: trip order

Plan: [plan.md](./plan.md) · Intent: [INTENT-trip-order.md](../.agents/docs/intent/INTENT-trip-order.md)

## Task 1: The zone vocabulary

**Description:** `src/lib/zones.ts` — the seven zones as ordered data, the
section→zone table, and the two pure functions over them.

**Acceptance criteria:**
- [ ] `ZONES` is the seven zones in trip order, each with its Spanish label and a
      one-line `why`
- [ ] `zoneFor(product)` assigns a zone, resolving the `Bebé` split through the
      existing `isFoodProduct`
- [ ] `groupByZone` returns non-empty zones in order, and is deterministic
- [ ] A section absent from the table falls back to `despensa`, and the fallback is
      observable rather than silent
- [ ] Pure: no React, no network, no storage

**Verification:**
- [ ] `npx vitest run src/lib/zones.test.ts`

**Dependencies:** None

**Files likely touched:** `src/lib/zones.ts`, `src/lib/zones.test.ts`

**Estimated scope:** Medium

## Task 2: Prove the vocabulary against the real catalogue

**Description:** The mapping is only trustworthy if it holds for all 4,330 products,
not for fixtures.

**Acceptance criteria:**
- [ ] Every product in `public/catalog/products.json` gets exactly one zone, and
      the seven counts sum to the catalogue size
- [ ] All 26 sections appear in `SECTION_TO_ZONE`; a section present in the data but
      missing from the table fails the test
- [ ] Baby formula lands in `despensa` and nappies in `no-alimentacion`, asserted
      from real products
- [ ] Fails if the table drifts from the catalogue

**Verification:**
- [ ] `npx vitest run src/lib/zones.test.ts`

**Dependencies:** Task 1

**Files likely touched:** `src/lib/zones.test.ts`

**Estimated scope:** Small

## Task 3: The count parity regression

**Description:** A shelf is cross-listed under several sections in the mirror, so
the tree and the listing disagreed by up to 107. Both paths now key on
`(section, shelf)`; this test is what keeps that true.

**Acceptance criteria:**
- [ ] For every section and every shelf in the real bundle, the count shown equals
      the length of the list it opens
- [ ] Written against the real bundle, not fixtures, so it covers all 26 sections
      and every shelf

**Verification:**
- [ ] `npx vitest run src/lib/category-tree.test.ts`

**Dependencies:** None

**Files likely touched:** `src/lib/category-tree.test.ts`

**Estimated scope:** Small

## Checkpoint: After Tasks 1-3

- [ ] `npm test`, `npm run typecheck`, `npm run lint` clean

## Task 4: The order preference

**Description:** The shape of what the user has arranged, and the pure operations
on it.

**Acceptance criteria:**
- [ ] A fresh preference is `trip` with both layers empty
- [ ] `isCustomised` is false for `trip` and true once either layer is set
- [ ] `nextMode` switches mode without touching either layer
- [ ] `resetOrder` clears both layers and returns to `trip`

**Verification:**
- [ ] `npx vitest run src/lib/ordering.test.ts`

**Dependencies:** Task 1

**Files likely touched:** `src/lib/ordering.ts`, `src/lib/ordering.test.ts`

**Estimated scope:** Small

## Task 5: Zone order (layer 1)

**Description:** `orderZones` applies a custom zone order over the proposal.

**Acceptance criteria:**
- [ ] With no custom order, returns the proposal
- [ ] A partial custom order keeps the named zones first and appends the rest, so a
      zone added later cannot vanish
- [ ] Unknown zone ids in storage are ignored rather than throwing

**Verification:**
- [ ] `npx vitest run src/lib/ordering.test.ts`

**Dependencies:** Task 4

**Files likely touched:** `src/lib/ordering.ts`, `src/lib/ordering.test.ts`

**Estimated scope:** Small

## Task 6: Within-zone order (layer 2)

**Description:** `orderWithinZone` applies a per-zone product arrangement.

**Acceptance criteria:**
- [ ] Products named in the layer come first, in that order
- [ ] Products not named keep catalogue order after them
- [ ] Ids no longer in the catalogue are ignored, and the rest of the arrangement
      still applies
- [ ] Does not mutate its input

**Verification:**
- [ ] `npx vitest run src/lib/ordering.test.ts`

**Dependencies:** Task 4

**Files likely touched:** `src/lib/ordering.ts`, `src/lib/ordering.test.ts`

**Estimated scope:** Small

## Task 7: Persistence

**Description:** `mercadonapp.order.v1`, written through on every mutation, with the
same degradation contract as `loadCart`.

**Acceptance criteria:**
- [ ] Mode and both layers survive a save/load round trip
- [ ] A corrupt or partially-valid stored value degrades to the proposal without
      throwing
- [ ] A zone emptied and refilled keeps its stored arrangement
- [ ] Stored ids absent from the catalogue do not destroy the arrangement

**Verification:**
- [ ] `npx vitest run src/lib/ordering.test.ts src/lib/cart.test.ts`

**Dependencies:** Tasks 5, 6

**Files likely touched:** `src/lib/ordering.ts`, `src/lib/ordering.test.ts`

**Estimated scope:** Medium

## Checkpoint: After Tasks 4-7

- [ ] Both layers round-trip through storage
- [ ] `A–Z` proven non-destructive by an explicit test

## Task 8: The cart, grouped by zone

**Description:** Render the list in zone blocks with a heading per non-empty zone.

**Acceptance criteria:**
- [ ] Every non-empty zone appears with its heading; empty zones are omitted
- [ ] Ordering follows the mode in effect
- [ ] Phone and window arrangements both deliberate — not one stretched
- [ ] Check-off, remove and the total all still work

**Verification:**
- [ ] `npx vitest run src/app/CartScreen.test.tsx`

**Dependencies:** Tasks 1, 4

**Files likely touched:** `src/app/CartScreen.tsx`, `src/app/CartScreen.test.tsx`,
`src/styles.css`

**Estimated scope:** Medium

## Task 9: The mode chip

**Description:** Always states the order in effect, with the proposal's one-line
reason.

**Acceptance criteria:**
- [ ] Reads `Orden de compra`, `Mi orden` or `A–Z`, and changes with the mode
- [ ] Its accessible name states the mode, not only its colour
- [ ] Carries the `why` line for the proposal
- [ ] Sits beneath the search field at the top of the cart, not in the app bar

**Verification:**
- [ ] `npx vitest run src/components/OrderChip.test.tsx`

**Dependencies:** Task 4

**Files likely touched:** `src/components/OrderChip.tsx`,
`src/components/OrderChip.test.tsx`, `src/styles.css`

**Estimated scope:** Small

## Task 10: Move controls

**Description:** Every reorder achievable without dragging, by keyboard alone.

**Acceptance criteria:**
- [ ] Zones can be moved up and down; the order persists
- [ ] Products can be moved within their zone; the order persists
- [ ] The first move switches the mode to `Mi orden`, with no separate edit mode
- [ ] A test performs a move with keyboard events only, no pointer events
- [ ] Disabled at the ends, and once the end is reached the control is not a
      no-op that looks active

**Verification:**
- [ ] `npx vitest run src/app/CartScreen.test.tsx`

**Dependencies:** Tasks 5, 6, 7, 8

**Files likely touched:** `src/app/CartScreen.tsx`, `src/styles.css`

**Estimated scope:** Medium

## Task 11: A–Z and reset

**Description:** The temporary view and the escape hatch.

**Acceptance criteria:**
- [ ] `A–Z` sorts by name and hides the move controls
- [ ] Entering and leaving `A–Z` preserves both custom layers exactly
- [ ] Reset returns to the proposal and clears both layers, behind a confirm
- [ ] Reload preserves the mode and both layers

**Verification:**
- [ ] `npx vitest run src/app/CartScreen.test.tsx src/lib/ordering.test.ts`

**Dependencies:** Tasks 7, 9, 10

**Files likely touched:** `src/app/CartScreen.tsx`, `src/app/CartScreen.test.tsx`

**Estimated scope:** Medium

## Checkpoint: After Task 11

- [ ] Full suite green
- [ ] Browser pass at 375 px and 1280 px
- [ ] Review with the human before the browse change

## Task 12: The browse tree, grouped by zone

**Description:** 26 sections stay; they are grouped under zone headings in zone
order, so the alphabetical interleaving goes away.

**Acceptance criteria:**
- [ ] Sections appear in zone order, each zone introducing its sections
- [ ] `Cuidado facial y corporal` never sits between `Conservas` and `Fruta`
- [ ] Non-food sits in its own block
- [ ] Section counts still equal the lists they open, on both layouts
- [ ] Drill-down and the breadcrumb are unchanged

**Verification:**
- [ ] `npx vitest run src/app/BrowseScreen.test.tsx`

**Dependencies:** Tasks 1, 3

**Files likely touched:** `src/app/BrowseScreen.tsx`,
`src/components/CategoryBrowser.tsx`, `src/app/BrowseScreen.test.tsx`,
`src/styles.css`

**Estimated scope:** Medium

## Checkpoint: After Task 12

- [ ] Counts still match on both layouts

## Task 13: Verification

**Description:** Prove it against the real catalogue and a real browser, not just
the suite.

**Acceptance criteria:**
- [ ] Catalogue-wide audit assertions pass in one run
- [ ] Browser pass at 320, 375, 768, 840, 1024, 1280, 1440 px: no horizontal
      overflow, layout switch unchanged
- [ ] Contrast audit clean on cart and browse in both layouts
- [ ] A reorder is walked end to end with the keyboard only, then survives a reload
- [ ] Total suite, typecheck, lint, build all green

**Verification:**
- [ ] `npm test`, `npm run build`, `npm run lint`

**Dependencies:** Tasks 1-12

**Files likely touched:** `scripts/audit-trip-order.ts` (new)

**Estimated scope:** Medium

## Task 14: Release

**Description:** Version to 1.1.0 and merge to `main`.

**Acceptance criteria:**
- [ ] `package.json` version is 1.1.0
- [ ] The branch merges to `main` with a clean tree
- [ ] 1.1.0 tagged

**Verification:**
- [ ] `git --no-pager log --oneline -1 main`

**Dependencies:** Task 13

**Files likely touched:** `package.json`

**Estimated scope:** XS

## Checkpoint: Complete

- [ ] Every acceptance criterion met
- [ ] Merged and tagged
