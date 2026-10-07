# Trip order — grouping that reads as a walk, not an index

Status: **proposed** · 2026-10-07 · branch `feature/store-map`

## Problem Statement

**How might we order products the way a shopping trip actually flows** — grouping similar things together, keeping non-food apart, and letting the order be corrected — so a list reads as a walk through the store instead of an alphabetical index?

Today the category list is alphabetical, which interleaves *Cuidado facial* between *Conservas* and *Fruta*, and the cart is in insertion order, which means it reads in whatever sequence you happened to tap. Neither matches the trip.

## Recommended Direction

**Zones group; physics sequences.** These are two different axes, not rival principles, and one ordering satisfies both:

- **Grouping** — which items cluster together — is answered by **zones** (same part of the store).
- **Ordering** — what comes first — is answered by **physics** (frozen last so it does not melt, cleaning never against food).

They rarely conflict, because the real walk through a Mercadona already runs *fresh → counters → aisles → chilled → frozen*, which is also the physics order. Where they do conflict, **physics wins**: a slightly suboptimal order costs you a minute, bleach on the bread costs you the bread.

**Two editable layers.** The user can correct the proposal at two levels:

1. **Cluster order** — drag the ~7 blocks (cheap: seven things, not four hundred).
2. **Order within a cluster** — drag individual products inside a block.

Dragging individual items across the whole catalogue is tedious and would never be used; dragging seven clusters is easy. Two layers cover both needs without either being fiddly.

**Always-visible state.** A chip states the current mode — `Orden de compra` · `Mi orden` · `A–Z` — because an order you cannot see is an order you cannot trust. Switching to `A–Z` is a **temporary view**: it never overwrites `Mi orden`.

**Explain the proposal.** Every proposed order carries a one-line reason ("Congelados al final para que no se derritan"), consistent with how the app already justifies its processing tiers and recommendations.

### Proposed zone order (to be validated, not asserted)

| # | Zone | Sections folded in |
|---|---|---|
| 1 | Frescos | Fruta y verdura |
| 2 | Mostrador | Carne, Marisco y pescado, Charcutería y quesos, Panadería y pastelería |
| 3 | Despensa | Aceite/especias/salsas, Conservas, Arroz/legumbres/pasta, Cacao/café, Cereales y galletas, Azúcar y chocolate, Aperitivos |
| 4 | Bebidas | Agua y refrescos, Zumos, Bodega |
| 5 | Refrigerados | Huevos/leche/mantequilla, Postres y yogures, Pizzas y platos preparados |
| 6 | Congelados | Congelados |
| 7 | No alimentación | Limpieza y hogar, Cuidado facial y corporal, Cuidado del cabello, Maquillaje, Mascotas, Fitoterapia, Bebé (non-food) |

Bebidas sits before Refrigerados deliberately: heavy items go in first and low, and chilled stock should be in the trolley for the shortest time.

## Key Assumptions to Validate

- [ ] **Our zone order matches your Mercadona.** This is the whole bet. *Test:* measure how many clusters you drag. Move nothing → we're right. Move five → we're guessing, and the custom layer is load-bearing.
- [ ] **Two layers are enough** — you never want to move a single item *across* clusters. *Test:* watch whether you try; if you do, add a third affordance.
- [ ] **Dragging works on a phone, one-handed.** If it's fiddly, the custom layer is dead weight and we should ship only the proposal. *Test:* time yourself doing it.
- [ ] **You shop from the list** rather than from memory. If you only open the app to check one thing, ordering barely matters.
- [ ] **You shop one Mercadona.** Two stores with different layouts cannot share one order.
- [ ] **Physics beats geography where they conflict.** *Test:* if you'd rather optimise the walk than protect the frozen goods, the precedence flips.

## MVP Scope

**In**

- A reviewable **zone mapping table** for the 26 sections (data, not logic buried in a branch).
- **Cluster the cart by zone**, in the proposed order; **same zones in the category browser**, replacing the alphabetical list.
- A visible **mode chip** reading the current state.
- **Layer 1:** drag to reorder clusters; persisted.
- **Layer 2:** drag to reorder products within a cluster; persisted.
- **`A–Z`** as a temporary escape hatch, never destructive.
- One-line **"why"** for the proposed order.
- **Fix two count bugs** found while refining this, each with a regression test:
  - **Shelf counts disagree between the list and the tree** — a shelf is cross-listed under several sections in the mirror, and the two code paths resolved that differently. 11+ mismatches, worst off by 107 (*Bebé → Leche y bebidas vegetales*: tree 8, listing 115). Fix: assign each shelf a single owning section, and make both paths derive from the products' own records.
  - **"50 resultados" is the search cap, not the total.** `search()` truncates at `MAX_RESULTS = 50`, so every broad query reports the cap as if it were the count. Fix: return the true total alongside the page, and render *"50 de 312 · Página 1"*.

**Out**

- Geographic aisles ("pasillo 7").
- Per-store profiles.
- Any time or distance estimate.

## Not Doing (and Why)

- **A floor-plan map** — its value was "don't backtrack", but it makes *you* translate a picture into an aisle. It can be wrong in a costly way (a wrong aisle label sends you to the wrong aisle), and it needs a planogram Mercadona does not publish and that differs per store. Ordering the list delivers the same benefit with none of the invented data.
- **Real-time position ("you are here")** — needs beacons or GPS; GPS does not work indoors and a web app cannot pair with beacons.
- **Auto-optimised route with distance maths** — we have no distances. A zone order captures most of the benefit; distance arithmetic would be fiction dressed as precision.
- **A permanently reordered catalogue with no controls** — rejected: an order you cannot correct repeats the exact mistake the app already refuses to make elsewhere (we will not show a processing claim the evidence does not support). A fixed order we guessed is the same overreach.
- **A–Z as the default** — it is what we have, and it is the complaint.
- **Grouping by recipe or meal** — a different product for a different job (menu planning), and out of scope for the trip.

## Open Questions

1. Should the mode chip apply to **search results** too, or only the cart and the category browser? Search is findability, not the trip — reordering it may help or may just be noise.
2. Does **`Mi orden`** extend to the category browser (sections), or only to products you have added?
3. Do clusters appear when the cart holds fewer than ~two clusters, or collapse to a plain list to avoid ceremony?
4. Is the **"why" line** shown always, or only the first few times — and does it belong on the chip or beneath the list?
5. Where does a product that fits **two zones** go? (Chilled drinks; frozen prepared meals.) Proposal: one owning zone per *section*, so a product inherits its section's zone and the ambiguity is resolved once, in data.
