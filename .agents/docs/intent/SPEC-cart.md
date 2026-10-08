# Spec: `cart`

Module id: `cart` · Depends on: `catalog` · Build order: 2nd (parallel with `nutrition`)

## Objective

Let me assemble a cart before I go, and check items off while I'm in the shop, one-handed, with the phone in the other hand.

**Design consequence of the intent:** the plan *is* the cart. There is no separate in-store capture step — no scanning, no receipt, no typing what I picked up. Checking an item off is the only in-store interaction.

## Output contract

```ts
interface CartItem {
  productId: number;
  addedAt: string;     // ISO timestamp
  checked: boolean;    // ticked off in the aisle
  quantity: number;    // how many; at least one, because "none" means removed
}

interface Cart {
  items: CartItem[];
  updatedAt: string;
}
```

- The cart is a **set of products with a count**: one line per product, plus how
  many of it. A quantity is never zero — "none of it" is what removal is for — so
  a count can never drift into a row that contributes nothing.
- What the list costs is **derived, never stored**: `cartTotal(cart, products)`
  multiplies each line by its quantity against the catalogue's `unitPrice`, which
  is the real price of one purchase unit (a litre of milk, the 1,07 kg of pears
  the catalogue lists). No total lives in the cart shape, which is why adding
  quantities needed no migration: the same function simply started multiplying.
- The total **says what it does not cover**: goods sold by weight are priced at
  the amount the catalogue lists rather than at what the scales say, and a product
  the catalogue has dropped cannot be priced at all. A derived number presented as
  a receipt would be the same kind of lie as an invented nutrition figure.
- Persisted in `localStorage` under `mercadonapp.cart.v1`. The key did **not**
  change when quantities arrived: a cart saved before them reads back as one of
  each, and a stored quantity that could not have come from the app (zero,
  negative, fractional, a string) is treated the same way. Bumping the version
  would have thrown away a list the user had already built.
- One user, one device. No accounts, no sync, no server. Nothing about the cart is transmitted anywhere.

## Behaviour

| Action | Result |
|---|---|
| Add a product | Appended with `checked: false` and `quantity: 1`; adding an already-present product is a no-op (set semantics), surfaced as "ya está en la lista" |
| Change quantity | `+1` / `−1`, clamped to a whole number of at least one. The step down is disabled at one rather than removing the row |
| Remove | Removes the line entirely, whatever its quantity |
| Check / uncheck | Toggles `checked`; this is the in-aisle interaction and must be one tap on a large target |
| Clear | Empties the cart, behind a confirm |
| Read the total | A bar above the tabs on a phone, a card beside the list on a window: what the list costs, how many items and lines it covers, and any caveat that applies |
| Reload | Cart, every `checked` flag and every quantity survive |
| Empty state | Explains what to do; never a blank screen |

Checked items stay visible but de-emphasised, so I can see what I've already got and what's left without a mode switch. Each row shows what that line costs, so the total adds up on screen rather than having to be taken on trust.

## Acceptance criteria

1. Cart and all `checked` flags survive a full reload and a browser restart.
2. Adding an existing product does not create a duplicate.
3. Toggling `checked` requires exactly one tap; the hit target is ≥ 44 px.
4. An unreadable or corrupt `localStorage` value degrades to an empty cart rather than a crash.
5. Unit tests cover: add/remove/toggle, duplicate add, persistence round-trip, corrupt-value recovery, and the storage-key version bump.
6. No network request is made by any cart action.
7. The total multiplies each line by its quantity; a product the catalogue no longer has is left out and said so; an empty list shows no total rather than a confident zero.
8. Every line shows its own priced total, and the summary states how many items and lines the total covers.
9. A quantity can never reach zero by arithmetic, and the step down is disabled at one.
10. A cart stored before quantities existed loads as one of each, and a stored quantity that could not have come from the app is treated the same way.
11. The total warns when an item is sold by weight. It is visible text, not a tooltip.

## Boundaries

**Always** — write through to storage on every mutation (never rely on an unload hook); keep the cart shape free of anything derived from nutrition, so `cart` stays independent of `nutrition`.

**Ask first** — adding categories to the cart model; adding any server-side persistence; any change to what a quantity means (a pack, a weight, a fraction).

**Never** — block the check-off interaction on a network call or on nutrition data being present; let a missing product (delisted from the catalogue) crash the cart — it renders as unavailable and can be removed; let a quantity reach zero, on the grounds that a zero row would be a line the total ignores.

## Open questions

1. **Stale items** — if the weekly mirror drops a product that's in my cart, keep
   it, or prune it? Settled as: keep it, mark it unavailable, and leave it out of
   the total (the summary says how many were left out).
2. **Quantities: settled twice, in opposite directions.** First "keep one of each",
   to keep the cart a pure checklist; then, once a total existed, **add them** —
   the checklist reading was real, but so was the error in the total whenever more
   than one of anything was bought. The reversal is the useful record: the thing
   that changed was not the cart but the presence of a total that claimed to be
   what the shop would cost.
3. **What a quantity means** is deliberately "one purchase unit", not a pack or a
   weight. Two litres of milk as a single 2 l bottle and as two 1 l bottles are
   different lines, and the app does not guess which one is meant.

## Ordering

Ordering lives in `ordering` (see `SPEC-ordering.md`) and `zones`: the cart is the
screen that carries the user's own sequence. The browse tree follows the proposal.
