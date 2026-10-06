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

- The cart is a **set**: no quantities, no totals. Quantities were explicitly ruled out — basket totals are out of scope for v1, so `CartItem` deliberately has no `quantity` field to drift into.
- Persisted in `localStorage` under `mercadonapp.cart.v1`. Versioned key so a later schema change doesn't corrupt an existing cart.
- One user, one device. No accounts, no sync, no server. Nothing about the cart is transmitted anywhere.

## Behaviour

| Action | Result |
|---|---|
| Add a product | Appended with `checked: false`; adding an already-present product is a no-op (set semantics), surfaced as "ya está en la lista" |
| Check / uncheck | Toggles `checked`; this is the in-aisle interaction and must be one tap on a large target |
| Remove | Removes the item entirely |
| Clear | Empties the cart, behind a confirm |
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

## Boundaries

**Always** — write through to storage on every mutation (never rely on an unload hook); keep the cart shape free of anything derived from nutrition, so `cart` stays independent of `nutrition`.

**Ask first** — adding quantities, totals, or categories to the cart model; adding any server-side persistence.

**Never** — block the check-off interaction on a network call or on nutrition data being present; let a missing product (delisted from the catalogue) crash the cart — it renders as unavailable and can be removed.

## Open questions

1. **Stale items** — if the weekly mirror drops a product that's in my cart, keep it, or prune it? Assumed keep with an "already unavailable" mark.
2. **Ordering** — manual order, catalogue order, or grouped by category so it follows a sensible walk through the shop? Grouping by category is the guess; asking because it's the one thing that affects aisle behaviour and I have no evidence either way.
