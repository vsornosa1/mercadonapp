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
}

interface Cart {
  items: CartItem[];
  updatedAt: string;
}
```

- The cart is a **set**: no quantities. `CartItem` deliberately has no `quantity`
  field to drift into — a field exists to be used, and nothing has needed it.
- What the list costs is **derived, never stored**: `cartTotal(cart, products)`
  sums the catalogue's `unitPrice`, which is the real price of one purchase unit
  (a litre of milk, the 1,07 kg of pears the catalogue lists). No total lives in
  the cart shape, so a `quantity` field could multiply into the same function
  later without a migration.
- The total states its assumption — **one of each** — and warns that goods sold
  by weight are priced from the label rather than the scales. A derived number
  presented as a receipt would be the same kind of lie as an invented nutrition
  figure.
- Persisted in `localStorage` under `mercadonapp.cart.v1`. Versioned key so a later schema change doesn't corrupt an existing cart.
- One user, one device. No accounts, no sync, no server. Nothing about the cart is transmitted anywhere.

## Behaviour

| Action | Result |
|---|---|
| Add a product | Appended with `checked: false`; adding an already-present product is a no-op (set semantics), surfaced as "ya está en la lista" |
| Check / uncheck | Toggles `checked`; this is the in-aisle interaction and must be one tap on a large target |
| Remove | Removes the item entirely |
| Clear | Empties the cart, behind a confirm |
| Read the total | A fixed bar above the tabs shows what the list costs, and says it counts one of each; an item sold by weight is flagged |
| Reload | Cart and every `checked` flag survive |
| Empty state | Explains what to do; never a blank screen |

Checked items stay visible but de-emphasised, so I can see what I've already got and what's left without a mode switch.

## Acceptance criteria

1. Cart and all `checked` flags survive a full reload and a browser restart.
2. Adding an existing product does not create a duplicate.
3. Toggling `checked` requires exactly one tap; the hit target is ≥ 44 px.
4. An unreadable or corrupt `localStorage` value degrades to an empty cart rather than a crash.
5. Unit tests cover: add/remove/toggle, duplicate add, persistence round-trip, corrupt-value recovery, and the storage-key version bump.
6. No network request is made by any cart action.
7. The total sums the catalogue price of one of each item; a product the
   catalogue no longer has is left out and said so; an empty list shows no total
   rather than a confident zero.
8. The total states that it counts one of each, and warns when an item is sold by
   weight. Both are visible text, not a tooltip.

## Boundaries

**Always** — write through to storage on every mutation (never rely on an unload hook); keep the cart shape free of anything derived from nutrition, so `cart` stays independent of `nutrition`.

**Ask first** — adding quantities or categories to the cart model; adding any server-side persistence.

**Never** — block the check-off interaction on a network call or on nutrition data being present; let a missing product (delisted from the catalogue) crash the cart — it renders as unavailable and can be removed.

## Open questions

1. **Stale items** — if the weekly mirror drops a product that's in my cart, keep
   it, or prune it? Settled as: keep it, mark it unavailable, and leave it out of
   the total (the summary says how many were left out).
2. **Quantities** — the total assumes one of each, which is what keeps the cart a
   checklist. Steppers would make it a true basket total and change the cart
   model, so it stays a question rather than an assumption.
3. **Ordering** — manual order, catalogue order, or grouped by category so it follows a sensible walk through the shop? Grouping by category is the guess; asking because it's the one thing that affects aisle behaviour and I have no evidence either way.
