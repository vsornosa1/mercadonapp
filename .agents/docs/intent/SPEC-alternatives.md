# Spec: `alternatives` v2 — trustworthy recommendations

Status: **awaiting approval** · Drafted 2026-10-07 · Depends on: `nutrition`, `swaps` (revision, not replacement)

## 1. Objective

The alternatives engine tells the user which product is better. An audit of all 4,330 products found it is **wrong in three specific ways**, and the most visible one is exactly the symptom reported: *"no better product is offered even when the product is ultra-processed — that shouldn't happen."*

The goal is not "more alternatives". It is **recommendations that are defensible when the user reads them**, and honest when there is nothing to recommend.

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
- Weaken a test to make the new ranking pass.

## 9. Success criteria

Re-measured by `node scripts/audit-alternatives.ts`; the *before* column is the current output and the *after* must be produced by the same script.

| # | Criterion | Before | After |
|---|---|---|---|
| 1 | Recommendations with a worse displayed tier | **85** | **0** |
| 2 | Better-tier peers dropped for lack of an expressible reason | **216** | **0** |
| 3 | Better-tier peers discarded by an undisclosed trade-off | **181** | **0** — each offered *with a visible cost*, or explicitly rejected with a stated reason |
| 4 | Recommendations that improve the processing tier | 548 of 1,510 | **>1,100 of 1,510**, the rest labelled as macro swaps |
| 5 | `unknown` appears as an improvement in any reason | possible | never |
| 6 | "Alimento entero" shown for a product whose label rests only on the ingredient heuristic | 473 products | **0** |
| 7 | Full suite green · coverage ≥90% · typecheck · lint | ✓ | ✓ |

Criterion 8: every number in §2 is reproduced by the audit script in a single run, so none of it is asserted from memory.

## 10. Open questions

**Q1 — Comparator divergence (blocking).** Yuka and MyRealFood both score products, and if either uses an established standard (Nutri-Score, NOVA, SAIN-LIM) we should adopt it rather than extend our own heuristic. Research is in flight; the findings will decide whether §3 is a patch to our engine or a replacement with a standard score. **This may change §3 substantially.**

**Q2 — Tier labels.** Renaming "Alimento entero" to "Sin aditivos" is accurate but weaker copy, and "Sin aditivos" could itself overclaim (a product can be additive-free and still industrially processed). Options: (a) rename by basis as proposed; (b) keep one label set but only show `whole` when there is NOVA or category-rule backing, showing "Sin aditivos" for the heuristic; (c) drop labels entirely and show the raw evidence (additive count + ingredient list). Which do you want?

**Q3 — Trade-off appetite.** §3.4 allows one disclosed macro regression. Is any regression acceptable with disclosure, or should processing-only improvements be the hard rule and macros strictly a tie-breaker?

**Q4 — Non-food.** Confirmed correct: no alternatives panel for the 1,361 non-food products. Should the *audit* exclude them from the success criteria (it currently does), so the numbers stay comparable across runs?

**Q5 — Shelf widening.** The audit re-confirmed **widening from leaf to shelf adds 0 qualifying swaps** (though 899 products have a better-tier peer somewhere in the shelf). If §3.4 loosens the Pareto rule this may change — worth re-measuring after implementation rather than assuming.
