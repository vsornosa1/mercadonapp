# Intent: trip order

Status: **confirmed** · 2026-10-08 · branch `feature/store-map`

This is the intent behind `SPEC-zones.md` and `SPEC-ordering.md`. It is the
authoritative statement; [docs/ideas/shopping-order.md](../../../docs/ideas/shopping-order.md)
is the earlier exploration and is **out of date in three places** (noted at its
head). Where the two disagree, this wins.

## Statement of intent

- **Outcome:** The shopping list reads as a walk. Products grouped into ~7 zones
  in trip order — non-food its own block, the trip ending in refrigerados →
  congelados — with the order a **proposal I can correct**, not a verdict. The
  browse screen stops being alphabetical: the 26 sections stay, grouped under
  those same zones.
- **User:** Me, in the shop, one hand on the phone and one on the trolley.
- **Why now:** The app is honest about what's in the food, but the list still
  arrives in the order I happened to add things, which makes me walk the shop
  twice. The nutrition gaps can wait; this is the friction I hit every trip.
- **Success:** One pass through the shop, no back-tracking. I can always see which
  zone I'm in. If the proposal is wrong for my store I fix it without dragging,
  and switching to `A–Z` to check something never costs me my arrangement.
- **Constraint:** No invented aisles or floor plans. A wrong aisle sends me to the
  wrong aisle; a coarse zone cannot be wrong in a costly way.
- **Out of scope:** Per-store layouts. Telemetry-based ordering. Drag as the only
  mechanism. The nutrition backfill for the 731 foods without data — that is the
  next piece of work, not this one. *(Quantities were listed here and have since
  been built; see SPEC-cart.md.)*

## What the interview settled

Four things were open before this was asked, and every one changed the plan:

| Question | Answer | Consequence |
|---|---|---|
| Trip order, or fill the nutrition gaps first? | **Both, trip order first** | Trip order is unblocked; the nutrition work waits on a data route |
| Hygiene (non-food last) or physics (cold chain last)? | **Physics** | Non-food is its own block at position 5; every trip ends at the freezer |
| Zone headings in the cart on a phone, or a flat list with only the chip? | **Headings** | ~150 px of a 375 px screen spent on boundaries, and worth it |
| Does the browse screen keep 26 sections or become 7 zones? | **Keep the sections, grouped under zones** | Fixes the alphabetical order without losing granularity |

The precedence answer is the notable one: `SPEC-zones.md` had already resolved it
by argument and flagged it as *"the single highest-value thing to validate"*. It is
now confirmed by the person who does the walking, not just by reasoning.

## Decisions taken while writing this down

Small forks not worth a question, recorded so they are reviewable rather than
silent. **Quantities are not among them**: they were asked and declined during this
interview and built later the same day, once the total existed to make the error
visible. See SPEC-cart.md §Open questions.

- **Every non-empty zone gets a heading**, always. Not "only when there are two or
  more": a rule that changes the list's shape as you add items is harder to trust
  than a heading that is occasionally redundant.
- **Search results keep relevance order.** The trip order governs the two screens
  where you are following the list — the cart and the browse tree. Search is
  findability, and reordering it by zone would fight the ranking that found the
  product. (This closes open question 1 of the idea document, one way.)
- **One owning zone per section.** A product inherits its section's zone, so a
  chilled drink does not need a per-product exception beyond the `Bebé` split that
  `isFoodProduct` already handles. (Closes idea question 5.)

## Resolved differently from the idea document

Both bugs found during the earlier refinement are fixed, but not as it proposed:

- **Shelf counts.** The idea proposed assigning each shelf a single owning section.
  `SPEC-zones.md` rejected that (it would displace 8 baby-formula products out of
  `Bebé`) and both views now key on the `(section, shelf)` pair instead. Shipped.
- **The search cap.** The idea proposed rendering `50 de 312`. The cap turned out
  to be applied *after* a full-catalogue scan, so it was removed instead: the
  count is the true total and pagination covers all of it (`leche` → 231 matches,
  12 pages). Shipped.

## Still open

Deliberately not decided here; they are cheap to change and better answered by use:

- Whether the zone order matches a real Mercadona trip. The test is how many
  clusters get moved: move none and the proposal is right, move five and the
  custom layer is carrying the feature.
- Whether `Mascotas` deserves its own zone. It stays in `no-alimentacion` for now.
- Whether `Mi orden` should also rearrange the browse tree's sections, or only the
  products inside the cart. Products are the clear case.
