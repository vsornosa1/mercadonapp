# Implementation Plan: trip order

## Overview

Make the list read as a walk. Products and sections are grouped into seven
**zones** in trip order — non-food its own block, the trip ending at the freezer —
and the order is a proposal the user can correct in two layers without ever
dragging. The same vocabulary orders the browse tree, which stops being
alphabetical.

Intent: [INTENT-trip-order.md](../.agents/docs/intent/INTENT-trip-order.md) ·
Specs: [SPEC-zones.md](../.agents/docs/intent/SPEC-zones.md),
[SPEC-ordering.md](../.agents/docs/intent/SPEC-ordering.md)

## Architecture Decisions

- **The mapping is data, not a branch.** `SECTION_TO_ZONE` and `ZONES` are exported
  tables, so moving a section is a one-line reviewable diff. Zone assignment is per
  *product* only where it must be: `Bebé` holds both nappies and formula, and that
  split already exists as the tested `isFoodProduct` — the exception list gets no
  second copy.
- **An unknown section falls back, loudly.** A section missing from the table lands
  in `despensa` and the fallback is asserted in tests, so a future Mercadona
  category cannot silently vanish from the app.
- **Groups are shared, sequence is per screen.** The cart follows the user's mode;
  the browse tree and search always follow the proposal and relevance. Reordering
  the place you *look things up* would be surprising, and search ranking already
  answers a different question.
- **`A–Z` is a view, not a mutation.** It never reads or writes the custom layers,
  because "I switched to A–Z to check something and lost my arrangement" is the one
  failure that would make the whole feature untrustworthy.
- **Move controls, never drag.** Keyboard-operable, testable with real user events,
  and reliable one-handed in a shop. Drag may be layered on later; it is never the
  only mechanism.
- **The count parity test is the regression that matters.** A shelf is cross-listed
  under several sections in the mirror, so the tree and the listing must key on the
  same `(section, shelf)` pair. The test walks the *real bundle* and asserts
  `count === opened.length` everywhere, so the 11+ historical mismatches can never
  come back.

## Task List

### Phase 1: The vocabulary (`zones`)

- [ ] Task 1: `src/lib/zones.ts` — `ZONES`, `SECTION_TO_ZONE`, `zoneFor`,
      `groupByZone`, plus the type contract. Tests first.
- [ ] Task 2: Prove it against the real catalogue — every one of the 4,330 products
      gets exactly one zone; the seven counts sum to the catalogue size; all 26
      sections appear in the table; baby food and nappies land in different zones,
      asserted from real products rather than fixtures.
- [ ] Task 3: The count parity regression — walk every section and shelf in the
      bundle and assert each count equals the list it opens.

### Checkpoint: Vocabulary
- [ ] `npm test`, `typecheck`, `lint` clean
- [ ] No UI yet; the mapping is reviewable as data

### Phase 2: The sequence (`ordering`)

- [ ] Task 4: The preference shape — `OrderMode`, defaults, `isCustomised`,
      `nextMode`, `resetOrder`. Tests first.
- [ ] Task 5: `orderZones` — the custom order applied over the proposal, tolerating
      a short or partial list.
- [ ] Task 6: `orderWithinZone` — layer 2, leaving unlisted products in catalogue
      order, ignoring ids that no longer exist.
- [ ] Task 7: Persistence under `mercadonapp.order.v1` — survives a reload, degrades
      to the proposal on a corrupt or partially-valid value, and keeps a zone's
      order while it is temporarily empty.

### Checkpoint: Sequence
- [ ] Both layers round-trip through storage
- [ ] `A–Z` proven non-destructive by test

### Phase 3: The cart

- [ ] Task 8: Group the cart by zone with a heading per non-empty zone; phone and
      window arrangements both deliberate, as with the rest of the app.
- [ ] Task 9: The mode chip — always states the current mode, carries the one-line
      `why`, sits beneath the search field at the top of the cart.
- [ ] Task 10: Move controls — zones up/down, and products within a zone, reachable
      by keyboard alone; the first move switches the mode to `Mi orden`.
- [ ] Task 11: `A–Z` and reset, including the confirm behind reset.

### Checkpoint: Cart
- [ ] Full suite green
- [ ] Browser pass at 375 px and 1280 px

### Phase 4: The browse tree

- [ ] Task 12: Sections grouped under zone headings, in zone order, on both
      layouts — the alphabetical interleaving is the original complaint.

### Checkpoint: Browse
- [ ] Section counts still equal the lists they open on both layouts

### Phase 5: Verification and merge

- [ ] Task 13: Catalogue-wide audit assertions and a browser verification pass:
      320–1440 px, no horizontal overflow, contrast clean, keyboard-only reorder
      walked end to end.
- [ ] Task 14: Version to 1.1.0, then merge `feature/store-map` to `main`.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| The zone order is wrong for a real store | High | It is a default, not a verdict: two editable layers, an always-visible mode chip, and `A–Z` that never destroys the arrangement |
| Headings cost too much of a 375 px screen | Medium | Empty zones are omitted; measure the real cost in the browser rather than estimating it |
| The browse tree and the cart drift into different vocabularies | Medium | Both consume the same `zones` module; the parity test covers counts |
| A custom order silently lost | High | Write-through on every mutation, and an explicit test that entering `A–Z` and returning preserves both layers |
| Scope creep into per-store layouts | Medium | `SPEC-zones.md` refuses aisle numbers outright; zones stay coarse on purpose |

## Open Questions

- Whether the zone order matches a real Mercadona trip — answered by use, not by
  more questions. The signal is how many clusters get moved.
- Whether `Mascotas` deserves its own zone. It stays in `no-alimentacion` for now.
- Whether a temporarily emptied zone should keep its stored order. Proposal: kept,
  so that removing and re-adding an item cannot quietly lose an arrangement.
