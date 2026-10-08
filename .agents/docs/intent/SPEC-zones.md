# Spec: `zones`

Module id: `zones` · Depends on: nothing · Build order: 1st (of the trip-order initiative)

Project-wide commands, structure and conventions live in [CAPABILITY-MAP.md](./CAPABILITY-MAP.md); this spec adds only what is specific to zones.

## Objective

Give the catalogue a **vocabulary of ~7 walkable zones**, so browsing and the cart can group products the way a trip flows instead of alphabetically. A zone is a *coarse* grouping: it says "this belongs to the same part of the trip", not "this is on aisle 7".

**Why a vocabulary and not a layout:** Mercadona publishes no planogram and layouts differ between store formats, so any aisle-level map would be invented. Zones are the coarsest grouping that is still useful and cannot be *wrong in a costly way* — a zone guess sends you to the right part of the store; a wrong aisle label sends you to the wrong aisle.

This module also owns the fix for the **cross-listing count bug** (§Behaviour), because "which section is this shelf in?" and "which zone is this in?" are the same data question and must not be answered twice.

## The vocabulary

Seven zones. Order is the **proposed trip sequence**, and is `ordering`'s default (it may be reordered by the user; the zones themselves are fixed).

| # | Zone id | Label | Sections folded in |
|---|---|---|---|
| 1 | `frescos` | Frescos | Fruta y verdura |
| 2 | `mostrador` | Carnicería y pescadería | Carne, Marisco y pescado, Charcutería y quesos, Panadería y pastelería |
| 3 | `despensa` | Despensa | Aceite-especias-salsas, Conservas-caldos-cremas, Arroz-legumbres-pasta, Cacao-café, Cereales y galletas, Azúcar-chocolate, Aperitivos, **Bebé (food shelves only)** |
| 4 | `bebidas` | Bebidas | Agua y refrescos, Zumos, Bodega |
| 5 | `no-alimentacion` | No alimentación | Limpieza y hogar, Cuidado facial y corporal, Cuidado del cabello, Maquillaje, Mascotas, Fitoterapia y parafarmacia, **Bebé (non-food shelves)** |
| 6 | `refrigerados` | Refrigerados | Huevos-leche-mantequilla, Postres y yogures, Pizzas y platos preparados |
| 7 | `congelados` | Congelados | Congelados |

### The one conflict, resolved by declared precedence

Two principles disagree on where non-food goes:

- *Hygiene* says non-food **last**, so chemicals never touch food.
- *Physics* says the **cold chain last** — melting is irreversible, and nothing should make you walk back to the freezer.

**Physics wins.** Originally this was decided by argument; it has since been put to
the person who does the walking and **confirmed** (see
[INTENT-trip-order.md](./INTENT-trip-order.md)). So `no-alimentacion` sits *before*
`refrigerados`/`congelados`: it still satisfies "apart" (it is its own block, never
interleaved with food), while the cold chain stays last. Heavy drinks sit at 4 for
the same reason they go at the bottom of a trolley.

### Bebé splits, and reuses existing logic

`Bebé` contains both food (`Alimentación infantil`, `Leche y bebidas vegetales`) and non-food (nappies, bottles, hygiene). A zone is resolved **per product**, not per section, reusing the already-tested `isFoodProduct` from `alternatives.ts` — so baby formula lands in `despensa` and nappies land in `no-alimentacion`, and the exception list has exactly one home.

## Output contract

```ts
export type ZoneId =
  | 'frescos'
  | 'mostrador'
  | 'despensa'
  | 'bebidas'
  | 'no-alimentacion'
  | 'refrigerados'
  | 'congelados';

export interface Zone {
  id: ZoneId;
  label: string;  // Spanish, as shown
  why: string;    // one line explaining its place in the sequence
}

/** Zone assignment is by section, with the Bebé split resolved per product. */
export function zoneFor(product: EnrichedCatalogProduct): ZoneId;

/** Groups products into zones in the proposed order; empty zones are omitted. */
export function groupByZone(
  products: readonly EnrichedCatalogProduct[],
): { zone: Zone; products: EnrichedCatalogProduct[] }[];

/** The zone table, in proposed order. Data, not logic buried in a branch. */
export const ZONES: readonly Zone[];
```

- **The mapping is data.** A `SECTION_TO_ZONE` table plus `ZONES`, both exported, so adding or moving a section is a reviewable diff in one place.
- **Unknown sections must not vanish.** A section absent from the table falls back to a defined zone (`despensa`, the largest) and the module exposes the fallback so it is visible in tests, never silent.
- No React, no fetching, no storage. Pure functions, like `src/lib/search.ts` and `src/lib/alternatives.ts`.

## Behaviour

### The count bug this module fixes

**Symptom (reported):** opening *Fruta* from the category list shows a count of **2**, then the shelf itself shows **50**.

**Cause (measured):** the mirror **cross-lists shelves under several sections**. *Fruta* (id 27) appears both under *Aceite, especias y salsas* (2 products whose own record declares that section) and under *Fruta y verdura* (48). The category tree counted by the pair `(section, shelf)`; the shelf listing filtered by `shelf` alone, so it showed all 50. There are **11+ such mismatches**, the worst off by 107 (*Bebé → Leche y bebidas vegetales*: tree 8, listing 115).

**Fix:** both views key on the **same `(section, shelf)` pair**, so a count can never disagree with the list it opens. A shelf legitimately appearing under two sections is *correct* — those are different products that share a shelf id — and each instance shows its own count.

**Rejected alternative:** forcing one owning section per shelf by majority. It would displace 8 baby-formula products out of `Bebé` and into *Huevos, leche y mantequilla*, which is worse UX than an honest duplicate.

### Other behaviour

| Concern | Behaviour |
|---|---|
| Empty zone | Omitted entirely — never an empty heading |
| Unknown section | Falls back to a zone, and the fallback is observable in tests |
| Zone labels | Spanish, no category jargon; the zone never invents an aisle number |
| Stability | `groupByZone` is deterministic for identical input |

### The browse tree, grouped by zone

The browse screen's 26 sections are currently listed **alphabetically**, which
interleaves *Cuidado facial* between *Conservas* and *Fruta* and puts *Limpieza y
hogar* between *Huevos* and *Maquillaje*. That is the complaint this module exists
to answer, and it is a browse problem, not only a cart one.

**Sections stay; the order and the grouping change.** The 26 sections remain the
unit you pick — collapsing them into 7 zone cards would lose the granularity that
makes them findable, and *Despensa* alone would swallow eight sections into one
card. Instead:

- Sections appear in **zone order**, and each zone introduces its sections with a
  **zone heading**.
- Non-food therefore sits in its own block instead of being sprinkled between food
  sections.
- The zone heading is the only thing added; section names, drill-down and counts
  are unchanged, so the `(section, shelf)` keying above still decides every count.

This is the same vocabulary as the cart (`ordering`), which is the point: one
grouping, two screens. The screen that *finds* a product and the screen that *walks*
it must not disagree about where things are.

Zone order here is **not** affected by `ordering`'s custom layers — browsing is
findability, so it follows the proposal. See `ordering` §"Both screens, one
vocabulary".

## Acceptance criteria

1. **A count always matches the list it opens.** Verified across every section and shelf in the catalogue by a test that walks the real bundle — the assertion is `count === opened.length` for all of them, so the 11+ current mismatches become zero.
2. `zoneFor` assigns every one of the 4,330 products to exactly one of the 7 zones; the seven counts sum to the catalogue size.
3. All 26 sections appear in `SECTION_TO_ZONE`; a test fails if a section in the catalogue data is missing from the table.
4. Baby food resolves to `despensa` and nappies to `no-alimentacion`, asserted from real catalogue products, not fixtures.
5. An unknown section falls back **and** the fallback is asserted, so a future Mercadona category cannot silently disappear.
6. `groupByZone` omits empty zones and is deterministic.
7. Pure: no React, no network, no storage; coverage floors hold.
8. **The browse tree presents sections grouped under zone headings, in zone
   order** — asserted, because the alphabetical interleaving is the original
   complaint and must not come back through a later refactor.

## Boundaries

**Always**
- Resolve the Bebé food/non-food split through `isFoodProduct` — one implementation, not a second copy of the list.
- Keep the mapping as exported data.
- Make the count fix and the zone mapping share the same `(section, shelf)` keying.

**Ask first**
- Adding, removing or reordering a zone.
- Moving a section between zones.
- Introducing any per-store or per-aisle notion.

**Never**
- Invent an aisle number, shelf position, or floor plan.
- Let a section or product fall outside the vocabulary silently.
- Duplicate the `isFoodProduct` shelf list.

## Open questions

1. **Is the zone order right for your store?** The precedence is confirmed
   (physics: non-food is its own block, *before* the cold chain), but only use will
   say whether the sequence matches a real trip. The test: how many clusters get
   moved? Move none and the proposal is right; move five and the custom layer in
   `ordering` is carrying the feature.
2. **`Mascotas` stays in `no-alimentacion`** — settled for now. Pet food is bulky
   and heavy, which argues for earlier placement, but a second non-food zone is
   more vocabulary than the trip needs. Revisit if a trip shows it is in the wrong
   place.
3. **Zone headings: settled — they are shown.** Every non-empty zone carries its
   heading, always, including a list that holds only one zone. A rule that hides
   headings below a threshold would change the list's shape as items are added,
   which is harder to trust than a heading that is occasionally redundant.
