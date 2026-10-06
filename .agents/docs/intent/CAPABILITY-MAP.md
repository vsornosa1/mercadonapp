# Capability Map: Mercadona Nutrition Assistant

Approved: 2026-10-06

## Statement of Intent (source of truth)

**Outcome:** An app on my phone that tells me the truth about what I'm buying at Mercadona — photo, calories, macros, and how processed/additive-heavy it is — and points me to a similar but better alternative, so my cart drifts toward whole products and fewer ultraprocesados.

**User:** Just me at first. Not hard-coded to one user (others will use it later), but no accounts, login, or multi-user anything in v1.

**Why now:** I want to eat healthier (whole, less processed, more variety) and hold/gain muscle, and nothing helps me at the moment I'm actually choosing a product in the aisle.

**Success:** A month in, my cart has noticeably fewer ultra-processed products and I stop second-guessing myself at the shelf.

**Out of scope (v1):** recipes, menu building, quantity/basket totals, price tracking and comparison, online ordering/checkout, barcode scanning, receipt photos, accounts and other users, native store app.

## Modules

| Module id | Responsibility | Depends on |
|---|---|---|
| `catalog` | Fetch and slim the Mercadona catalogue mirror; build the local search index | — |
| `nutrition` | Enrich each product with numeric nutrition (Open Food Facts, by EAN) and a processing/additive signal | `catalog` |
| `cart` | Build a cart and check items off in-store; browser-local persistence, one user | `catalog` |
| `swaps` | Rank healthier same-category alternatives for a product, with a stated reason | `nutrition`, `catalog` |

**Build order:** `catalog` → (`nutrition` ∥ `cart`) → `swaps`

Module specs: [SPEC-catalog.md](./SPEC-catalog.md), [SPEC-nutrition.md](./SPEC-nutrition.md), [SPEC-cart.md](./SPEC-cart.md), [SPEC-swaps.md](./SPEC-swaps.md). This map is the index; filenames are not the index.

## Platform

TypeScript + React + Vite, built as an installable PWA (`vite-plugin-pwa`). **No backend.** All data is baked in at build time; the app makes no runtime network requests other than product images.

## Verified data facts (checked 2026-10-06, not assumed)

| Need | Available from Mercadona? |
|---|---|
| Name, EAN, brand, price (unit / bulk / reference), size, 3-level category tree | ✅ |
| Photos — multiple angles, up to 3600px (imgix URLs) | ✅ |
| Ingredients, as an HTML string **including E-numbers** | ✅ (1,776 of 2,860 live products) |
| Allergens, as an HTML string | ✅ |
| **Numeric nutrition (kcal, protein, carbs, fat, sat, sugar, salt)** | ❌ **zero fields, across all 4,319 products** |

The entire catalogue was pulled to confirm the last row: `nutrition_information` is always exactly `{allergens, ingredients}`.

Consequence: **nutrients come from Open Food Facts**, joined on EAN. Processing/additive signal comes from Mercadona's ingredient text, or from Open Food Facts' own `nova_group` and `additives_tags` where available.

Mercadona's `robots.txt` disallows `/api`, and its abuse detector hard-blocked an IP after ~4,500 rapid requests (>10 minutes). **Therefore: no scraping, ever — not at runtime, not in CI.** The catalogue comes from a mirror.

## Data sources

| Source | Used for | Access | Licence |
|---|---|---|---|
| `datania/mercadona-catalog` (Hugging Face dataset) | Full catalogue: names, EANs, photos, prices, categories, ingredients HTML | Dataset snapshot download, build time | MIT (data provenance is Mercadona's) |
| Open Food Facts API v2 | Numeric nutrition, `nova_group`, `additives_tags` | `https://world.openfoodfacts.org/api/v2/product/{ean}.json` — build time only, polite, cached | ODbL 1.0 — attribution required in the UI |

Dataset shape, verified: `categories.json`, `product_ids.json`, `categories/<id>.json`, `products/<id>.json` (raw Mercadona API shape).

## Project structure

```
CAPABILITY-MAP.md      → this file: intent, modules, cross-cutting decisions
SPEC-*.md              → one spec per module id
scripts/               → build-time data pipeline (network lives ONLY here)
  fetch-catalog.ts     → download mirror snapshot
  enrich.ts            → Open Food Facts join + additive parsing
  build-bundle.ts      → slim catalogue + search index for the app
data/
  raw/                 → downloaded mirror (gitignored)
  enriched/            → OFF + processing output (COMMITTED — slow, polite, expensive to redo)
  cache/off/           → per-EAN OFF responses, so re-runs are incremental (gitignored)
public/
  catalog/             → emitted bundle + search index (generated)
  icons/               → PWA icons
src/
  app/                 → screens and routing
  components/          → presentational components
  lib/                 → pure logic: search, processing, swaps, storage (the tested code)
  types/               → shared domain types
tests/                 → integration tests spanning modules
docs/
  intent/              → confirmed statement of intent
```

## Commands

```
# Data pipeline (build time; the only place network access is allowed)
npm run data:fetch           # download the mirror snapshot into data/raw/
npm run data:enrich          # OFF join + additive parse → data/enriched/ (incremental, resumable)
npm run data:build           # emit slim catalogue + search index → public/catalog/

# App
npm run dev                  # Vite dev server
npm run build                # tsc --noEmit && vite build   (no network)
npm run preview              # serve the production build
npm run typecheck            # tsc --noEmit
npm run lint                 # eslint . --max-warnings 0
npm run lint:fix             # eslint . --fix
npm test                     # vitest run
npm run test:watch           # vitest
npm run test:coverage        # vitest run --coverage
```

## Code style

```ts
// Pure logic lives in src/lib, takes data in, returns data out. No fetching, no React, no globals.
export function findSwaps(
  product: Product,
  catalog: readonly Product[],
  nutrition: NutritionIndex,
  limit = 3,
): Swap[] {
  const candidates = catalog.filter(
    (c) => c.leafCategoryId === product.leafCategoryId && c.id !== product.id,
  );
  return rank(candidates, product, nutrition).slice(0, limit);
}
```

Conventions: TypeScript `strict`; no `any`; named exports only; pure functions in `src/lib`; all user-facing strings in Spanish; every figure that comes from data is rendered with its unit and its source.

## Testing strategy

Vitest for everything; the tested core is `src/lib`. Unit tests are colocated (`src/lib/processing.test.ts`).

| Concern | Level |
|---|---|
| E-number / additive parsing, processing tiers, OFF field mapping, swap ranking, search normalisation | unit, exhaustive — these are pure functions and every edge case is cheap to pin |
| Cart persistence, product card, swap list rendering | component (Testing Library) |
| End-to-end shopping flow | manual on the phone in v1 |

Coverage: **≥ 90% lines for `src/lib/**`**, enforced as a Vitest threshold so it cannot silently decay. The data pipeline is verified by its own outputs (coverage report + spot-checked products), not by mocking Open Food Facts.

## Boundaries

**Always**
- Spanish UI strings; product names exactly as Mercadona publishes them.
- Label every nutrition figure `por 100 g` / `por 100 ml`, and name its source.
- Show the raw ingredient text behind any processing claim.
- Keep all network access inside `scripts/`.
- Run tests before commits.

**Ask first**
- Adding any npm dependency.
- Changing the processing heuristic thresholds or the OFF field mapping.
- Changing the catalogue source or the refresh cadence.
- Changing the PWA caching strategy.

**Never**
- Request `tienda.mercadona.es` at runtime, in tests, or in CI.
- Fabricate, interpolate, or estimate a nutrition value. No data shows as no data.
- Present our ingredient heuristic as NOVA, or as a health rating.
- Commit secrets or tokens.
- Delete a failing test instead of fixing what it caught.

## Success criteria

1. Installed to the home screen from the browser; opens and searches with the network off.
2. **Zero runtime requests to `tienda.mercadona.es`** across a full session, verified in DevTools.
3. Searching `platano` finds `Plátano de Canarias` — accent-insensitive.
4. Every product shows a photo and either per-100 g nutrition or an explicit `sin datos nutricionales`. Never a blank, never a guess.
5. Any processing claim is accompanied by the ingredient text it was derived from.
6. Every cart item offers at least one ranked alternative with a numeric reason, or states plainly that none was found.
7. A fresh clone reaches a working app with `npm ci` → `npm run data:build` → `npm run build`, with no network in the last step.

## Open questions

1. **Variety** — named as a goal but not in the confirmed outcome. v1, or a later layer?
2. **Swap scope** — same leaf category only (my assumption), or allow cross-category suggestions?
3. **Two processing scales** — OFF gives `nova_group` (authoritative, often missing); we derive our own tier from ingredients (always available, ours). Display as one scale or as two distinct, labelled signals?
4. **ODbL attribution** — where does the Open Food Facts credit live so it satisfies share-alike without cluttering the aisle view?
5. **Variable-weight products** (fresh produce priced per kg) — in swaps, or excluded because comparisons are ill-defined?
6. **Refresh cadence** — the mirror updates weekly; does the enrichment re-run weekly too, or on demand?
