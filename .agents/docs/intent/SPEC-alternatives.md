# Spec: `alternatives` v2 — trustworthy recommendations

Status: **awaiting approval** · Drafted 2026-10-07 · Depends on: `nutrition`, `swaps` (revision, not replacement)

## 1. Objective

The alternatives engine tells the user which product is better. An audit of all 4,330 products found it is **wrong in three specific ways**, and the most visible one is exactly the symptom reported: *"no better product is offered even when the product is ultra-processed — that shouldn't happen."*

The goal is not "more alternatives". It is **recommendations that are defensible when the user reads them**, and honest when there is nothing to recommend.

§10 records how Yuka, MyRealFood and Nutri-Score solve the same problem, and why we are **not** adopting an established score.

## 2. Problem statement — measured, not assumed

Audit of the real catalogue (`scripts/audit-alternatives.ts`, 4,330 products; food = 3,007, non-food = 1,323):

| Symptom | Count | Verdict |
|---|---|---|
| Recommendations that suggest a product with a **worse displayed tier** than the original | **85** | **defect — this is the reported bug** |
| Products with a better-tier peer that is worse on *nothing*, yet **no recommendation offered** | **216** | defect — the improvement is real but inexpressible |
| Products whose better-tier peers are **all** worse on ≥1 macro, so nothing is offered | **181** | design flaw — a real trade-off is silently discarded |
| Recommendations that improve **nothing but a macro** (same tier both sides) | **877 of 1,510** | design flaw — over half of all advice is "marginally more protein" |
| Products already at the best tier available in their leaf | 1,076 | legitimate — correct to offer nothing |
| Products with no comparable peer at all | 24 | legitimate |

Food with recommendations: **1,510**. Food without: **1,497** (= 216 + 181 + 1,076 + 24).
Recommendations improving the tier: **548**. Same-tier-only: **877**.

### 2.1 Root cause of "recommends a worse product" (85 cases)

**The ranking is blind to the badge it displays.** `SwapSignals` carries `additiveCount`, `additiveCodes`, `novaGroup`, `protein`, `sugars`, `salt` — but **not the composed `tier`/`basis`** that the UI shows. So:

```
"Leche desnatada Hacendado"  displays whole      (heuristic: no E-numbers, no markers)
   ↓ recommended over it, reason = "más proteína"
"Leche desnatada +Proteínas" displays processed  (heuristic: contains markers)
```

Both had `novaGroup: null`, so the `nova` dimension was "not comparable" and skipped. The candidate won on protein alone and was shown as *better* — while the screen displays it as **more processed**. The app contradicts itself.

### 2.2 Root cause of "a better product exists but isn't offered" (397 cases)

Two distinct sub-causes:

- **216 cases: the improvement is unprovable.** A better-tier peer exists that is worse on *no* comparable dimension, so `reasonsFor` produces **zero reasons** and the candidate is discarded. *The tier improved — and the engine cannot say so, because it has no tier field.*
- **181 cases: the Pareto rule rejects a real trade-off.** Every better-tier peer is worse on at least one macro (protein, sugars, salt). For an app whose entire thesis is *fewer ultraprocesados*, silently rejecting "less processed but 0,3 g more sugar" is the wrong default — the user should see the trade-off and decide.

### 2.3 Root cause of weak advice (877 cases)

The score is `reasons.length` with a lexicographic sort where **processing and macros carry comparable weight**. So "same tier, +1 g protein" is presented as the headline recommendation. The app's stated purpose is processing, not protein.

### 2.4 Additional defect: `unknown` ranks as an improvement

A naive tier ordering puts `unknown` *below* `whole` (0 < 1). `unknown` means **we don't know** — it must never be treated as better *or* worse than a known tier. This bug was live in the audit script itself and produced inflated numbers (96 → 85 once fixed); it must not exist in the product. Any new ordering must encode this explicitly.

### 2.5 Additional defect: `Swap.product` is typed `CatalogProduct`

`Swap.product` has no `processing` field, so neither the audit nor the UI can read the tier of a recommended product without a lookup by id. The UI *does* show that product's badge, so the type is lying about what the app needs. See §3.1.

### 2.6 Additional finding: the tier label overclaims

**473 products are labelled "Alimento entero" purely because their ingredient list contained no E-numbers and no marker words** (`basis: ingredient-heuristic`), with no NOVA group from Open Food Facts. Examples:

| Product | Ingredient list | Label shown |
|---|---|---|
| `Café en cápsula extra fuerte Hacendado` | `100% café molido de tueste natural` | **"Alimento entero"** |
| `Leche entera Hacendado` | `Leche entera de vaca` | "Alimento entero" ✓ defensible |
| `Medio pollo certificado troceado` | `100% Pollo` | "Alimento entero" ✓ defensible |

For milk and chicken the label is right. For **coffee capsules** it is not: the product is packaged and industrially prepared, and the label reads as a NOVA-1 claim while the heuristic only measured *additives*. This violates the project's own boundary — *"never present a heuristic tier as NOVA"* — because the **label text itself** makes that claim.

Tier distribution across all 4,330 products: `ultra-processed` 1,592 · `unknown` 1,397 · `whole` 826 · `processed` 515.

## 3. Proposed design

### 3.1 The displayed tier becomes a first-class ranking input

`SwapSignals` gains `tier: ProcessingTier` and `basis`. The ranking uses **the same composed signal the user sees** — one source of truth, so the badge and the advice can never disagree.

**Type fix:** `Swap.product` becomes `EnrichedCatalogProduct`, so the tier of a recommended product is reachable where it is displayed instead of requiring a lookup by id. `findSwaps` therefore takes `readonly EnrichedCatalogProduct[]`; callers already pass enriched data.

### 3.2 Tier ordering is explicit, and `unknown` is neutral

```
whole (0)  <  processed (1)  <  ultra-processed (2)      unknown = neutral
```

`unknown` is never "better" and never "worse": it neither qualifies a candidate on processing nor blocks one. A candidate with `unknown` can still win on additives or macros, and the reason shown will name the dimension that actually differed.

### 3.3 Processing outranks macros

A recommendation is ranked by, in order:

1. **Tier improvement** (whole > processed > ultra-processed)
2. **Fewer additives**
3. **Macro improvement** (protein up, sugars/salt down)

Consequence: "less processed" always beats "more protein". A same-tier candidate can still be offered, but **only** when a real non-processing improvement exists, and it is labelled as a macro swap rather than presented as healthier.

### 3.4 Trade-offs are shown, not hidden

Replace the absolute Pareto filter with **one disclosed downside**:

- A candidate that is better on tier/additives may carry **at most one macro regression**, which is **displayed** as a labelled cost (`+0,3 g azúcar`, `−1,2 g proteína`).
- Two or more regressions still disqualify it — that is no longer a trade-off, it is a different product.
- The UI must render the cost with the same visual weight as the benefit, never smaller.

### 3.5 Better-tier candidates are always expressible

If the tier improves, that alone is a reason (`{ kind: 'tier', from, to }`), so the 308 silently-dropped candidates surface and the engine can always explain itself.

### 3.6 Honest labels

The tier label must describe what is measured. Proposed:

| Tier | Label now | Proposed label |
|---|---|---|
| `whole` | Alimento entero | **Sin aditivos** (when `basis: ingredient-heuristic`) |
| `whole` | Alimento entero | **Poco procesado** (when `basis: off-nova`, NOVA 1) |
| `processed` | Procesado | Procesado |
| `ultra-processed` | Ultraprocesado | Ultraprocesado |

The label varies with `basis` so a heuristic never borrows NOVA's authority. *(Open question Q2 — see below.)*

## 4. Commands

```
Test:     npm test                       # focused: npm test -- src/lib/swaps.test.ts
Coverage: npm run test:coverage          # ≥90% floor on src/lib and scripts
Types:    npm run typecheck
Lint:     npm run lint
Audit:    node scripts/audit-alternatives.ts   # regenerates the numbers in §2
Build:    npm run build
```

## 5. Project structure (unchanged)

```
src/lib/swaps.ts          → SwapSignals, compare, findSwaps, buildSwapSignals   (revised)
src/lib/alternatives.ts   → evaluateAlternatives, isFoodProduct, outcomes      (revised)
src/lib/benefits.ts       → reason → displayable {label, delta, direction}     (extended: 'tier', 'cost')
src/components/SwapList.tsx / BenefitChips.tsx                                 (revised: show cost)
src/types/swaps.ts        → Reason union                                       (extended)
scripts/audit-alternatives.ts → the measurement that proves the fix
```

## 6. Code style

```ts
// Tier is a ranking input, and `unknown` is explicitly neutral rather than lowest.
const TIER_ORDER: Record<ProcessingTier, number | null> = {
  whole: 0,
  processed: 1,
  'ultra-processed': 2,
  unknown: null, // never counts as better, never blocks
};

// Disclosed trade-off: at most one regression, always rendered with the benefit.
export interface Reason { /* … */ }
export interface TradeOff {
  kind: Reason['kind'];
  from: number;
  to: number;
}
export interface Swap {
  product: CatalogProduct;
  reasons: Reason[];      // never empty
  cost: TradeOff | null;  // at most one, shown with equal weight
  score: number;
}
```

## 7. Testing strategy

Vitest, colocated. The revised ranking is pure logic, so it carries the weight:

- **Unit, exhaustive** — tier ordering incl. `unknown` neutrality; the "never recommend a worse tier" property; disclosed cost acceptance (0 regressions ok, 1 disclosed, 2 rejected); tier-only reasons.
- **Regression tests from the audit** — every case in §2 becomes a named test: the 96 worse-tier cases must disappear; the 308 unprovable-improvement cases must gain a `tier` reason; a sample of the 242 trade-offs must now surface with a cost.
- **Property test** — over the *real catalogue*: no returned swap ever has a worse displayed tier; `reasons` is never empty. This is the guard that the original defect cannot return.
- Coverage floor ≥90% on `src/lib` unchanged.

## 8. Boundaries

**Always**
- Rank on the same composed tier the UI displays.
- Never present a heuristic tier under a NOVA-sounding label.
- Show a trade-off with the same weight as the benefit, or do not offer the swap.
- Keep the audit script runnable — its numbers are the evidence for this spec.

**Ask first**
- Introducing a standard nutrient-profiling score (Nutri-Score, NOVA proper) — licence and semantics change.
- Changing the additive-marker list or the category rule.
- Any change that makes a recommendation cross a leaf category.

**Never**
- Treat `unknown` as better or worse than a known tier.
- Return a swap whose extracted reasons are empty.
- Present a macro-only swap as "healthier".
- Compute and display a score under an official label's name (Nutri-Score, NOVA) from partial data — see §10.
- Weaken a test to make the new ranking pass.

## 9. Success criteria

Re-measured by `node scripts/audit-alternatives.ts`; the *before* column is the pre-v2 output and the *after* is produced by the same script. Results in §11.

| # | Criterion | Before | After |
|---|---|---|---|
| 1 | Recommendations with a worse displayed tier | **85** | **0** |
| 2 | Better-tier peers dropped for lack of an expressible reason | **216** | **0** |
| 3 | Acceptable better-tier peers not offered at all | **181** | **0 of the achievable ceiling** |
| 4 | Recommendations that improve the processing tier | 548 of 1,510 | **the full achievable ceiling** (derived by the script, not a round number) |
| 5 | `unknown` appears as an improvement in any reason | possible | never |
| 6 | A heuristic tier presented as a whole-food claim | 473 products | **0** |
| 7 | Full suite green · coverage ≥90% · typecheck · lint | ✓ | ✓ |

Criterion 8: every number in §2 is reproduced by the audit script in a single run, so none of it is asserted from memory.

**Note on criterion 4:** the first draft used a hand-picked target (>1,100). That was a guess dressed as a criterion. The script now *derives* the ceiling from the acceptance rules — the set of products with at least one better-tier peer that regresses on no processing dimension and at most one macro — and the criterion is "offered ≥ achievable". A criterion that cannot be reached is a bug in the criterion.

## 10. Comparator analysis — Yuka, MyRealFood, Nutri-Score

Researched to answer the question *"should we adopt an established score instead of patching our own engine?"* Sources are cited; anything unverified is marked.

### Yuka

| Aspect | Finding |
|---|---|
| Scale | **0–100**, higher is better |
| Components | **Three**, not two: nutrition **60%**, additives **30%**, organic bonus **10%** |
| Nutrition input | Explicitly **Nutri-Score** (sugar, sodium, saturated fat, energy, protein, fibre, fruit/veg) |
| Additives | Each additive graded green/yellow/orange/red from EFSA/IARC and independent studies |
| Hard cap | **Any high-risk additive caps the total at 49/100** — so the additive dimension can outweigh its nominal 30% |
| NOVA / ultra-processed | **Not a documented scoring input.** Processing appears only indirectly, through additives |
| Missing nutrition | **No rating at all.** Yuka also leaves unrated: alcohol, sugar, infant formula, supplements, pet food, and **products sold by weight** |

Verified: `help.yuka.io` "How are food products scored?", "Products with no nutritional values", "Unrated food products".

**What we take from it:**
1. **The hard cap is precedent for §3.3.** Yuka does not let a good macro profile outvote a bad additive profile — it caps the score. Our §3.3 ("processing outranks macros") is a weaker version of the same principle, which is reassuring about the direction.
2. **Yuka does not answer our question.** It has no processing tier, so our defect — *a ranking blind to the tier it displays* — is not one Yuka can have, and its architecture is not a fix for ours.
3. **Our no-data behaviour is deliberately more informative.** Yuka shows nothing for a product with no nutrition; we show an additive-based tier plus "Sin datos nutricionales". That is a defensible divergence, and it is precisely why §2.6 matters: if we show a tier where Yuka shows nothing, the label must not overclaim.

### MyRealFood

**Unverified.** First-party sources were unreachable (404 / JS-only), and search engines were blocked. The widely repeated heuristic — *ultraprocesado = more than 5 ingredients and/or cosmetic additives* — **could not be confirmed against any official document** and must not be treated as fact. Note that even if true, it would **not** fix the §2.6 case: `Café en cápsula` lists one ingredient (`100% café molido`), so that rule would also call it fine. The problem there is the *label*, not the classification.

### Nutri-Score

- **Publicly and fully specified**, so technically implementable: negative points (energy, sugar, saturated fat, salt) minus positive points (fibre, protein, fruit/veg/legumes/nuts), range ≈ −15…+40, mapped A–E with category-specific rules (general, fats/oils/nuts/seeds, beverages, cheese).
- **Revised**: 2022 committee recommendations (rescaled sugar/salt/fibre/protein, protein-cap exemption removed, nuts/seeds moved, red-meat rules), effective 2024.
- **Licence terms: unverified.**

**Why we should NOT implement it**, despite the appeal:

1. **We lack an input.** Nutri-Score's positive points include **% fruit/vegetables/legumes/nuts**, which Open Food Facts does not give us for most products. A Nutri-Score computed without it would be systematically wrong.
2. **It is an official, regulated front-of-pack label** used by governments. Reproducing it from partial data would misrepresent an official mark — the same class of error as §2.6, but worse, because the label carries legal weight.
3. **It measures nutrition only.** Our defects are about *processing* and about a ranking that contradicts its own display. Nutri-Score answers neither.

### Decision on Q1

**Patch our engine (§3). Do not adopt Nutri-Score now, and do not adopt NOVA** (we have it for only 36% of products, and 32% of products are `unknown`).

A **nutrition-quality** signal is worth having eventually, but as its own clearly-named capability with its own spec — explicitly *not* called Nutri-Score, and only if we can source the missing inputs. Adding a half-Nutri-Score would import a second honesty problem instead of fixing the first.

## 11. Outcome — implemented 2026-10-07

Decisions taken (the user delegated Q2 and Q3; both are recorded here so they can be revisited cheaply — each is a label map or one line of ranking logic).

### Decisions

**Q2 — labels: option (b), generalised.** The badge states *the strongest claim the evidence supports*, chosen by `basis`:

| tier | `off-nova` | `ingredient-heuristic` | `category-rule` |
|---|---|---|---|
| `whole` | Poco procesado | **Sin aditivos** | **Fresco** |
| `processed` | Procesado | Con aditivos | — |
| `ultra-processed` | Ultraprocesado | Muchos aditivos | — |
| `unknown` | Sin datos | Sin datos | Sin datos |

NOVA vocabulary is used **only when NOVA produced the tier**. `Sold as "Alimento entero"` is gone: it was a processing claim our additive scan had not earned. Rationale in `src/lib/tier-labels.ts`; the mapping is one table and trivially reversible.

**Q3 — trade-offs: one disclosed macro regression, only to buy a processing improvement.** Shipped as two stricter rules than the spec originally proposed:

1. **A processing regression always disqualifies.** The first implementation allowed a *tier* regression as a disclosed cost, and the audit immediately caught it (16 recommendations offering a product whose badge said *more processed*). "Processing outranks macros" has to mean processing never regresses.
2. **Macros may be traded off at most one at a time**, and only when a processing reason justifies it — so macro-only swaps remain pure improvements.

This narrowed `TradeOff.kind` to `protein | sugars | salt`, making the impossible tier/additive cases unrepresentable and deleting dead code.

### Re-measured success criteria

`node scripts/audit-alternatives.ts`, 4,330 products (food 3,007 / non-food 1,323):

| # | Criterion | Before | After |
|---|---|---|---|
| 1 | Recommendations with a worse displayed tier | 85 | **0** ✅ |
| 2+3 | An acceptable better-tier peer that is not offered | 397 | **0 of 1,043 achievable** ✅ |
| 4 | Recommendations that improve the tier | 548 | **1,043** — equals the derived ceiling ✅ |
| 5 | `unknown` used as an improvement | possible | **0** ✅ |
| 6 | A heuristic tier presented as a whole-food claim | 473 products | **0** ✅ |

Supporting detail: food with recommendations **1,510 → 1,846**; recommendations carrying a disclosed cost **1,103**; tier reasons emitted **2,279**; unchanged 1,073 products are correctly told nothing beats them.

### The remaining gap: ultra-processed products with no alternative

Of the ultra-processed products, **1,253 now get an alternative and 323 do not (20%)**. That residual is not engine failure — it breaks down as:

| Cause | Count | Is it correct? |
|---|---|---|
| **Every peer in the aisle is also ultra-processed** | **267 (83%)** | Yes. There is no less-processed option *in that aisle* — e.g. ready-to-drink coffee and chocolate milkshakes are uniformly NOVA 4. The app correctly says it compared and found nothing better. |
| A less-processed peer exists but had **>1 macro regression** | 53 | Policy decision (see Q3): two regressions is a different product, not a trade-off. **Open to revisit** — this is the one bucket where a stricter reading costs the user a recommendation. |
| No comparable peer at all | 3 | Data gap. |

The dominant cause is a **product-aisle problem, not a code problem**: for those 267 products the honest answer really is "nothing here is better", and the app says exactly that. It also suggests a future feature worth its own spec: telling the user *"this whole category is ultra-processed — consider a different aisle"* rather than comparing within it.

### Verification

- 293 tests green, coverage 95.7% branches (recovered from a dip to 91.8% — the drop exposed the dead cost cases above).
- Typecheck, lint, build, catalogue guard all clean.
- Browser-verified: *Leche desnatada* no longer recommends the more-processed *+Proteínas* variant and now reads **"Sin aditivos"**; *Batido de chocolate Puleva* shows three alternatives, two with a visible **"A cambio: Más azúcar 9,5 g → 10 g"** cost and one pure improvement; *Plátano* reads **"Fresco"**; *Champú* shows no badge, no nutrition and no alternatives.

### One caveat worth stating

The ordering tests I added (`findSwaps — ordering`) passed on first run, which per the project's own TDD rule is a yellow flag: they characterise behaviour that already existed rather than driving it. They earn their place as regression protection for the tie-break order, but they did not prove anything new.

## 12. Open questions

**Q1 — Comparators (RESOLVED).** Answered in §10: patch our engine; do **not** adopt Nutri-Score (we lack the fruit/veg input, and reproducing an official regulated label from partial data would misrepresent it) and do **not** adopt NOVA (36% coverage, 32% `unknown`). A nutrition-quality signal is a separate future capability, explicitly not named Nutri-Score. **§3 stands.**

**Q2 — Tier labels (RESOLVED, implemented).** Shipped as the basis-aware table in §11. The concern raised here was real and is handled: "Sin aditivos" cannot overclaim *processing* because it does not mention processing, and the basis line ("según ingredientes") says where it came from. **Open for revisit:** whether "Sin aditivos" should read "Pocos aditivos" (it is accurate even at zero, and slightly less absolute).

**Q3 — Trade-off appetite (RESOLVED, implemented).** One disclosed **macro** regression only, and only to buy a processing improvement; processing regressions disqualify outright. See §11.

**Q4 — Non-food.** Confirmed correct: no alternatives panel for the 1,323 non-food products, and the audit excludes them from its criteria so numbers stay comparable across runs. **No action.**

**Q5 — Shelf widening.** Re-confirmed after v2: widening from leaf to shelf still adds **0** qualifying swaps. With the stricter processing rule the answer is now even more clear-cut — the limiting factor is data quality, not category breadth. **Closed.**
