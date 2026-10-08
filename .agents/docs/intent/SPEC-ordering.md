# Spec: `ordering`

Module id: `ordering` · Depends on: `zones` · Build order: 2nd (of the trip-order initiative)

Project-wide commands, structure and conventions live in [CAPABILITY-MAP.md](./CAPABILITY-MAP.md); this spec adds only what is specific to ordering.

The intent behind this module — and the four decisions taken in the interview that
changed it — is [INTENT-trip-order.md](./INTENT-trip-order.md).

## Objective

Make a list **read as a walk**. Zones `zones` decides what belongs together; this module decides what comes first — and, crucially, lets the user **correct it**.

**The design principle this module exists to honour:** the app already refuses to show a processing claim the evidence does not support, and refuses to hide the ingredient list behind a badge. An order we guessed and the user cannot change is the same overreach. So the proposal is a *default*, never a verdict.

**Two editable layers.** Dragging individual products across the catalogue is tedious and would never be used; dragging ~7 zones is trivial. Two layers cover both needs without either being fiddly:

1. **Layer 1 — cluster order:** the order of the zones themselves.
2. **Layer 2 — within-cluster order:** the order of products inside a zone.

## Output contract

```ts
export type OrderMode = 'trip' | 'custom' | 'az';

export interface OrderPreference {
  mode: OrderMode;
  zoneOrder: ZoneId[];                              // layer 1; empty = use the proposal
  withinZone: Partial<Record<ZoneId, number[]>>;    // layer 2; product ids, per zone
}

/** Zones in effect, per preference: custom order applied over the proposal. */
export function orderZones(pref: OrderPreference): Zone[];

/** Products inside one zone, honouring layer 2 and leaving unknowns in place. */
export function orderWithinZone(
  pref: OrderPreference,
  zone: ZoneId,
  products: readonly EnrichedCatalogProduct[],
): EnrichedCatalogProduct[];

export function isCustomised(pref: OrderPreference): boolean;
export function resetOrder(): OrderPreference;              // back to the proposal
export function nextMode(pref: OrderPreference, mode: OrderMode): OrderPreference;
```

- Persisted in `localStorage` under **`mercadonapp.order.v1`**, versioned like the cart's key.
- **A corrupt or partially-valid stored value degrades to the proposed order**, exactly as `loadCart` degrades to an empty cart. Never a crash, never a silent scramble.
- Product ids that no longer exist are ignored rather than removed from storage, so a catalogue refresh does not destroy a user's arrangement.

## Behaviour

| Concern | Behaviour |
|---|---|
| **Default** | `mode: 'trip'` — zones in the proposal's order, products in catalogue order within each zone |
| **Chip** | Always visible, always stating the current mode: `Orden de compra` · `Mi orden` · `A–Z`. An order you cannot see is an order you cannot trust |
| **First edit** | Dragging or moving *anything* switches `mode` to `'custom'` — no separate "enter edit mode" step |
| **Layer 1 edit** | Reorders the zone blocks; persisted immediately, written through on mutation |
| **Layer 2 edit** | Reorders products within one zone; persisted immediately |
| **`A–Z`** | A **temporary view**. It never reads or writes `zoneOrder`/`withinZone`, so switching to it and back cannot lose your arrangement |
| **In `A–Z`** | Reorder affordances are hidden — `A–Z` is explicitly not the walk — and the chip offers "Volver a mi orden" |
| **Reset** | Clears both layers and returns to `trip`, behind a confirm |
| **Reload** | Mode and both layers survive |
| **Empty zone** | Omitted; never an empty heading |
| **Zone headings** | Shown for every non-empty zone. The chip states the *mode*; the headings state the *boundaries*, and a walk whose boundaries are invisible cannot be followed |
| **`why`** | The proposal carries a one-line reason for its order (`Congelados al final para que no se derritan`), shown with the chip |

### Both screens, one vocabulary

| Screen | Follows | Why |
|---|---|---|
| Cart | The mode in effect — proposal, `Mi orden`, or `A–Z` | This is the walk: it must be the order the user arranged |
| Browse tree | The **proposal**, always | Browsing is findability. A custom cart order that also silently rearranged where you look things up would be surprising, and it would stop the tree being a shared reference |
| Search results | Relevance | Reordering results by zone would fight the ranking that found the product |

So the **groups** are shared (one vocabulary of seven zones) while the **sequence**
is per-screen (the user's, or the proposal). Acceptance criterion 10 means exactly
this and no more.

### Where the chip lives

Beneath the search field, at the top of the cart — **not** in the app bar. The bar is
already carrying the name, the search field, and either the list button (phone) or
the sections (window); a seventh control would crowd it at 375 px and compete with
navigation for the same corner. The chip belongs with the content it describes.

### Reordering must not require dragging

**Every reorder is achievable without drag-and-drop.** Drag is a convenience; the required path is explicit **move controls** (up/down on each cluster, and on each product within a cluster). This matters for three independent reasons:

- **Accessibility:** drag-and-drop is not keyboard-operable, and the project holds itself to WCAG 2.1 AA.
- **Reliability:** dragging on a phone, one-handed, in a shop, with a trolley in the other hand, is exactly the fiddly interaction this feature was warned against.
- **Testability:** move controls are testable with real user events; synthesised drags are not.

Drag may be added on top. It is never the only way.

## Acceptance criteria

1. A fresh install shows `mode: 'trip'` with zones in the proposal's order.
2. Moving a zone persists, and survives a reload.
3. Moving a product within a zone persists, and survives a reload.
4. **Switching to `A–Z` and back preserves both custom layers exactly** — asserted, because this is the failure that would make the feature untrustworthy.
5. The chip's accessible name states the current mode, and changes when the mode changes.
6. Reset restores the proposed order and clears both layers.
7. **Every reorder is reachable by keyboard alone** — a test performs the move with `userEvent` keyboard interaction, no pointer events.
8. A corrupt `mercadonapp.order.v1` value degrades to the proposal without throwing (mirrors the cart's corrupt-value test).
9. Stored ids absent from the catalogue are ignored, and the arrangement survives.
10. The same order applies to **both the cart and the category browser** — one vocabulary, two screens.
11. Pure functions; no React, no network, no storage inside `src/lib`.

## Boundaries

**Always**
- Show which order is in effect, everywhere the order is applied.
- Keep `A–Z` non-destructive.
- Write through to storage on every mutation.
- Provide the non-drag path for every reorder.

**Ask first**
- Adding an order mode, or removing one.
- Changing the proposal's precedence rules (those live in `zones`).
- Any per-device sync or sharing of the order.

**Never**
- Overwrite or discard a custom order as a side effect of viewing another mode.
- Reorder anything silently — a changed order must be visible as a changed mode.
- Make drag-and-drop the only mechanism.
- Infer an order from usage data (there is no telemetry, and inventing one would be the same "guessed order" mistake).

## Open questions

1. ~~**Chip placement on a 375 px header.**~~ Settled: beneath the search field, at
   the top of the cart, not in the app bar (see §"Where the chip lives").
2. ~~**Does `Mi orden` extend to the category browser's sections**~~ Settled: no.
   The browser follows the proposal; only the cart carries a custom sequence (see
   §"Both screens, one vocabulary").
3. ~~**Cluster headings in the cart.**~~ Settled: shown, for every non-empty zone.
4. **What happens to a zone's stored product order when the zone temporarily
   empties** — kept (so it returns as arranged) or dropped? Proposal: **kept**,
   because dropping it would make removing and re-adding an item quietly lose an
   arrangement, which is the failure mode this module is most sensitive to. To be
   asserted rather than assumed.
