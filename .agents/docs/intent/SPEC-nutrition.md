# Spec: `nutrition`

Module id: `nutrition` · Depends on: `catalog` · Build order: 2nd (parallel with `cart`)

## Objective

Give every product two honest things the Mercadona API refuses to provide: **numeric nutrition** and a **processing/additive signal**. This is the module the whole product rests on — it is the value, and it is the risk.

**The verified problem:** Mercadona publishes ingredients and allergens but **not a single numeric nutrition field**, across all 4,319 products. Numbers therefore come from Open Food Facts, joined on EAN. Where no number exists, the app says so — it never invents one.

## Inputs

| Input | Source |
|---|---|
| `ean` per product | `catalog` |
| `ingredientsHtml` per product | `catalog` |
| Numeric nutrition, `nova_group`, `additives_tags` | Open Food Facts API v2, by barcode |

## Output contract

```ts
interface NutritionFacts {
  source: 'off' | 'none';
  offCode?: string;
  per100: {                                  // per 100 g / 100 ml, any field may be null
    kcal: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    saturatedFat: number | null;
    sugars: number | null;
    salt: number | null;
    fiber: number | null;
  } | null;
  novaGroup: 1 | 2 | 3 | 4 | null;           // OFF's own scale, authoritative, often absent
  additives: { code: string; label: string | null }[];  // normalised E-numbers
}

interface ProcessingSignal {
  basis: 'off-nova' | 'ingredient-heuristic';
  tier: 'unknown' | 'whole' | 'processed' | 'ultra-processed';
  additiveMarkers: string[];                 // the words that triggered it, so it can be shown
}
```

## Open Food Facts field mapping

Request: `GET https://world.openfoodfacts.org/api/v2/product/{ean}.json?fields=code,product_name,nutriments,nova_group,additives_tags,ingredients_text`

| OFF field | Ours |
|---|---|
| `nutriments.energy-kcal_100g` | `per100.kcal` |
| `nutriments.proteins_100g` | `per100.protein` |
| `nutriments.carbohydrates_100g` | `per100.carbs` |
| `nutriments.fat_100g` | `per100.fat` |
| `nutriments.saturated-fat_100g` | `per100.saturatedFat` |
| `nutriments.sugars_100g` | `per100.sugars` |
| `nutriments.salt_100g` | `per100.salt` |
| `nutriments.fiber_100g` | `per100.fiber` |
| `nova_group` | `novaGroup` |
| `additives_tags` (`en:e407`) | `additives[].code` → `E407` |

Everything is **per 100 g / 100 ml**, because that is the only basis OFF provides consistently and it is comparable across pack sizes.

## Fallback heuristic (only when OFF does not supply `nova_group`)

Derived from Mercadona's ingredient HTML. Thresholds are ours, tunable, and **must be disclosed as ours**:

| Condition | Tier |
|---|---|
| no ingredient text published | `unknown` |
| 0 E-numbers and 0 additive markers | `whole` |
| 1–2 E-numbers, or 1 marker | `processed` |
| ≥ 3 E-numbers, or ≥ 2 markers | `ultra-processed` |

- E-number pattern: `E-?\d{3,4}[a-z]?` (case-insensitive; Mercadona writes both `E-407` and `E407`).
- Additive markers: `aroma`, `aromas`, `colorante`, `conservador`, `estabilizante`, `espesante`, `emulgente`, `edulcorante`, `antioxidante`, `gasificante`, `potenciador del sabor`, `almidón modificado`.
- `unknown` is a first-class answer. Absence of an ingredient list is **not** evidence of wholesomeness, and must never render as `whole`.

## Politeness and caching

- Sequential with a ~1 s delay; no concurrency by default.
- A descriptive `User-Agent` identifying the app — this is only possible because enrichment runs in a script, not a browser.
- Exponential backoff with jitter on `429`/`503`; honour `Retry-After`.
- Every response cached per-EAN in `data/cache/off/`; the run is **incremental and resumable**.
- A coverage report is printed at the end: `with kcal / with protein / with nova_group / total`.

## Acceptance criteria

1. Re-running `npm run data:enrich` performs **zero** OFF requests for already-cached EANs (asserted by the script).
2. No nutrition value in the output is invented, interpolated, or estimated. Values are either from OFF or `null`.
3. Products with no EAN, or an EAN OFF doesn't know, end up `source: 'none'` and the UI shows `sin datos nutricionales`.
4. Partial data is preserved: a product with kcal but no fiber keeps the kcal.
5. The script prints coverage counts, so the real gap is visible after every run rather than assumed.
6. Unit tests cover: the E-number regex (both spellings, multi-additive strings, `E-339ii`-style suffixes), every threshold boundary, the OFF mapping including nulls, and the `unknown`-not-`whole` rule.

## Boundaries

**Always** — label figures `por 100 g`/`por 100 ml`; disclose the basis (`NOVA` vs our heuristic) wherever a tier is shown; keep the raw ingredient text available behind every claim.

**Ask first** — changing thresholds; changing the field mapping; adding a second nutrition source; raising concurrency.

**Never** — estimate a missing macro from the product description or photos (one existing OSS project does exactly this — its numbers are unvalidated and we are not copying that); present a heuristic tier as NOVA; show a tier of `unknown` as reassuring.

## Open questions

1. **Two scales, one badge?** OFF's `nova_group` and our heuristic are different scales with different reliability. Recommendation: show OFF's NOVA when present, label ours differently (e.g. `aditivos`), and never blend them into a single number.
2. **OFF coverage on the live catalogue** — the brand-level proxy is strong (~10,918 Hacendado products; 100/100 macro completeness in a sample), but a spot-checked EAN from the live catalogue was missing. Only the first real enrichment run reveals true hit-rate.
3. **Licence surface** — ODbL share-alike applies to an adapted database. Confirm attribution placement and whether committing `data/enriched/` triggers any obligation we care about.
