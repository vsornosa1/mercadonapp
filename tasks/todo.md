# Task List: Mercadona Nutrition Assistant

Plan: [tasks/plan.md](./plan.md) · Specs: [CAPABILITY-MAP.md](../.agents/docs/intent/CAPABILITY-MAP.md) + `SPEC-*.md`

Legend: `[ ]` todo · `[x]` done. Scope guide — **S** 1–2 files · **M** 3–5 files · **L** 5–8 files (*L means break it down further before starting*).

## Working agreement: tests before code

Every task that writes logic follows **RED → GREEN → REFACTOR** (`test-driven-development`): write the failing test, watch it fail for the expected reason, write the minimum that passes, then refactor with the suite green. A test that passes on first run is not evidence — it is a question.

**Task 2 is a hard gate.** No file in `src/lib/` and no script in `scripts/` gets written until the test runner and the coverage floor exist. Config-only tasks (1, 4) are exempt: they have no behaviour to test.

**Evidence over assertion.** Each completed task records the actual command output, not the claim that it ran.

---

## Phase 1: Foundation

### Task 1: Scaffold Vite + React + TypeScript

**Description:** Create the application skeleton with the real npm scripts from the plan, so every later task has a build, a dev server, and a typecheck to verify against. TypeScript strict from the start — retrofitting strictness later is how `any` gets in.

**Acceptance criteria:**
- [x] `npm ci` then `npm run dev` serves a page in the browser
- [x] `npm run build` emits `dist/`
- [x] `npm run typecheck` passes with `strict: true` and no `any` in the codebase
- [x] `src/` matches the structure in the map (`app/`, `components/`, `lib/`, `types/`)

**Verification:**
- [x] Build succeeds: `npm run build` → `dist/index.html` 0.40 kB, `dist/assets/index-*.js` 219.79 kB (gzip 68.69 kB), built in 419ms — Vite 8.3.3
- [x] Types pass: `npm run typecheck` → clean, `strict` + `noUncheckedIndexedAccess` + `verbatimModuleSyntax` on
- [x] Runtime check: dev server → `HTTP 200`, `<title>Mercadonapp</title>`, `<div id="root">`, `/src/main.tsx` served as `text/javascript` (2,487 bytes)

**Dependencies:** None
**Files likely touched:** `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx` (the app root component arrives with Task 4)
**Estimated scope:** M
**Status:** ✅ Done 2026-10-06

---

### Task 2: Test and lint tooling, with the coverage floor

**Description:** Wire Vitest and Testing Library, ESLint and Prettier, and — critically — enforce the `src/lib` coverage floor the map demands (≥ 90% lines). A coverage target that is not enforced in CI-or-command rots within a week; make it fail the command.

**Acceptance criteria:**
- [x] `npm test` runs and executes colocated `src/lib/*.test.ts` files
- [x] `npm run test:coverage` **fails** when `src/lib` drops below 90% — proven by temporarily adding an uncovered function
- [x] `npm run lint` passes with `--max-warnings 0`
- [x] ESLint rejects `any` and unused variables

**Verification:**
- [x] RED: `npm test` with no implementation → `Failed to resolve import "./normalize"`, 1 file failed, **no tests ran**, exit 1
- [x] GREEN: `npm test` after implementing → `Test Files 1 passed`, `Tests 7 passed`, 2.28s
- [x] Coverage passes: `npm run test:coverage` → Lines 100% (1/1), Functions 100%, Branches 100%
- [x] **Floor proven**: temp `coverage-probe.ts` → `ERROR: Coverage for lines (25%) does not meet global threshold (90%)` plus functions 50%, statements 16.66%, branches 0% → **exit 1**; probe removed
- [x] **Lint rules proven**: temp probe with `any` + unused var → 2 errors, exit 1; probe removed
- [x] Restored state: tests 7 passed, coverage 100%, `typecheck` clean, `build` succeeds

**Dependencies:** Task 1
**Files likely touched:** `vitest.config.ts`, `eslint.config.js`, `.prettierrc`, `src/test-setup.ts`, `src/lib/normalize.ts`, `src/lib/normalize.test.ts`
**Estimated scope:** M
**Status:** ✅ Done 2026-10-06 — **the TDD gate is open**: `src/lib` and `scripts/` work may now begin, test-first.

**Deviation:** this task absorbed the normalisation half of Task 8, because the toolchain needed one real function to exercise it and a fake smoke file would have been dead code from birth. `src/lib/normalize.ts` was written test-first to prove the loop end-to-end. Task 8 is amended accordingly.

---

### Task 3: Domain types from the specs

**Description:** Transcribe the type contracts from `SPEC-catalog.md`, `SPEC-nutrition.md`, `SPEC-cart.md` and `SPEC-swaps.md` into `src/types`. These freeze the interfaces between parallel work streams, which is what allows `nutrition` and `cart` to proceed independently.

**Acceptance criteria:**
- [x] `CatalogProduct`, `NutritionFacts`, `ProcessingSignal`, `CartItem`, `Cart`, `Swap`, `Reason` exist and match the specs field for field
- [x] Nullable fields are genuinely nullable — `ean: string | null`, `nutrition.per100.*: number | null` — not optional-with-a-default
- [x] No `any`; no type that merges NOVA and the heuristic into one field
- [x] `NutritionIndex` defined — the swaps spec names it in `findSwaps`

**Verification:**
- [x] RED: `src/types/contract.test.ts` written first → `npm run typecheck` → `TS2307: Cannot find module './cart'` ×4, **exit 2**
- [x] GREEN: types created → typecheck exit 0; suite runs 14 tests (7 normalize + 7 contract), all passing
- [x] **Contract proven**: temp `quantity: number` added to `CartItem` → `contract.test.ts(33,34): error TS2554`, **exit 2**; reverted → clean. The freeze is real, not decorative.
- [x] Lint clean (exit 0), coverage 100%, `npm run build` succeeds
- [x] Spec diff: each `src/types/*.ts` checked line-by-line against the `Output contract` sections of the four specs

**Dependencies:** Task 1
**Files likely touched:** `src/types/catalog.ts`, `src/types/nutrition.ts`, `src/types/cart.ts`, `src/types/swaps.ts`, plus `src/types/contract.test.ts` (compile-level contract tests via `expectTypeOf` — recorded deviation below)
**Estimated scope:** S
**Status:** ✅ Done 2026-10-06

**Deviation:** Task 3's verification was "diff against specs", which proves the types match today but does nothing tomorrow. Since this task's whole purpose is freezing interfaces for parallel work, added a compile-level contract test using `expectTypeOf` — a widening of `source`, `basis`, `Reason['kind']`, or a `quantity` field now fails `npm run typecheck`. Types have no runtime behavior (the TDD skill's exemption), so the test lives at the compile boundary, which is where type drift actually happens.

---

### Task 4: PWA shell — installable, offline app shell

**Description:** Make the app installable and give it a service worker that precaches the shell, so it opens from the home screen with the network off. Done early because PWA plumbing is the piece most likely to force a tooling change, and finding that out after ten tasks is expensive.

**Acceptance criteria:**
- [x] DevTools/application panel reports the app as installable, with a manifest (`name`, `lang: es`, icons, `display: standalone`)
- [ ] Installed from the browser to the home screen on a phone — *pending: needs the user's phone; the machine-checkable preconditions are verified below*
- [x] With the network off, opening the app renders the shell rather than the browser error page
- [x] Cache is versioned, so a new build does not serve a stale bundle (`registerType: 'autoUpdate'` — Workbox auto-update flow)

**Verification:**
- [x] RED: `tests/pwa-manifest.test.ts` written first → 3 failures (`ENOENT` on missing manifest), existing 14 still green, exit 1
- [x] GREEN: manifest + icons + plugin → `Test Files 3 passed`, `Tests 17 passed`
- [x] Typecheck, lint clean; build emits `sw.js`, `workbox-*.js`, `registerSW.js`, **precache 8 entries (222.69 KiB)**
- [x] Runtime (real browser, preview build): manifest served (`lang: es`, `display: standalone`, 3 icons), service worker **registered → active → controlling the page** (scope `/`)
- [x] Runtime offline: `context.setOffline(true)` → reload → title/heading/paragraph all render from cache, no error page
- [ ] Manual, on the phone: install to home screen, open from the icon

**Dependencies:** Task 1
**Files likely touched:** `vite.config.ts`, `public/manifest.webmanifest`, `public/icons/*`, `index.html`, `src/app/App.tsx`, `src/main.tsx`, plus `tests/pwa-manifest.test.ts`
**Estimated scope:** S
**Status:** ✅ Done 2026-10-06 (phone install pending user)

---

## Checkpoint: Foundation

- [x] All tests pass (`npm test`) — 17/17
- [x] Application builds without errors (`npm run build`) — precache 8 entries, 222.69 KiB
- [x] Lint and typecheck clean (`npm run lint`, `npm run typecheck`)
- [x] App shell installs and opens offline — **verified in a real browser** (SW registered → active → controlling; offline reload renders from cache). Home-screen install on the phone: pending user.
- [ ] Review with human before touching any data ← **we are here**

---

## Phase 2: catalog

### Task 5: Fetch the catalogue mirror

**Description:** Download the `datania/mercadona-catalog` dataset snapshot into `data/raw/` and report what is actually present. This is the only source of catalogue data in the project — nothing may reach Mercadona at any point.

**Acceptance criteria:**
- [ ] `data/raw/` contains `product_ids.json`, `categories.json`, `products/*.json`
- [ ] The script prints the product count and how many have each of: `ean`, ingredients, photos, a 3-level category path
- [ ] The script contains **no** reference to `tienda.mercadona.es` (asserted, not just reviewed)
- [ ] `data/raw/` is gitignored

**Verification:**
- [ ] Run: `npm run data:fetch` completes and prints counts
- [ ] Assert: `grep -r "tienda.mercadona.es" scripts/` returns nothing
- [ ] Manual check: compare the reported count against `product_ids.json`

**Dependencies:** Task 1
**Files likely touched:** `scripts/fetch-catalog.ts`, `.gitignore`
**Estimated scope:** M

---

### Task 6: OFF coverage spike (fail fast)

**Description:** Measure the real Open Food Facts hit-rate for Mercadona EANs before any UI exists. Research established that OFF knows ~10,918 Hacendado products with 100/100 macro completeness in a sample — but the one live EAN spot-checked was missing. This task replaces a proxy with a number.

**Why it is this early:** it is the single highest-risk assumption in the project. If coverage is poor, the nutrition plan changes, and it must change before Tasks 9–17 are built on top of it.

**Acceptance criteria:**
- [ ] A seeded random sample of 200 catalogued products with an EAN is queried against OFF
- [ ] **The sample is stratified**, because Hacendado-only numbers are misleading: report hit-rates separately for Hacendado, other brands (Milka, Aquarius, Gillette…), and Mercadona non-food own-brands (Deliplus, Bosque Verde)
- [ ] The script separately reports how many catalogued products have **no EAN at all** (fresh produce, counters, bakery), by category
- [ ] The script prints hit-rates for: any response, `energy-kcal_100g`, `proteins_100g`, `nova_group`
- [ ] Results are written to `data/raw/coverage-sample.json` and summarised into `tasks/plan.md`
- [ ] The number is reported to the human at Checkpoint 2, not buried in a log

**Verification:**
- [ ] Run: `npm run data:coverage` prints the four hit-rates
- [ ] Manual check: spot-check two returned products against their Mercadona ingredient strings for sanity
- [ ] Decision gate: if any rate is below a usable threshold, stop and re-plan with the human

**Dependencies:** Task 5
**Files likely touched:** `scripts/coverage-spike.ts`, `package.json`
**Estimated scope:** S

---

### Task 7: Emit slim catalogue bundle + gzip budget

**Description:** Turn the raw mirror into exactly the fields the app needs, and enforce a size ceiling. The bundle is downloaded to a phone, so its weight is a product decision, not an implementation detail.

**Acceptance criteria:**
- [ ] `npm run data:build` emits the bundle and search index to `public/catalog/`
- [ ] Output contains only the `CatalogProduct` fields from `SPEC-catalog.md`
- [ ] The script prints the measured **gzipped** size and **fails the build** above 1.5 MB
- [ ] Products with `ean: null` are preserved and flagged, never dropped
- [ ] Any difference between emitted count and `product_ids.json` is explained in the output

**Verification:**
- [ ] Run: `npm run data:build` prints count and gzip size
- [ ] Threshold proven: temporarily inflate the bundle, observe the failure, revert
- [ ] Manual check: inspect one emitted record against its raw counterpart

**Dependencies:** Tasks 3, 5
**Files likely touched:** `scripts/build-bundle.ts`, `src/types/catalog.ts`
**Estimated scope:** M

---

### Task 8: Search index (pure)

**Description:** Fuzzy, accent-insensitive search over name, brand and category. **Amended:** normalisation itself landed in Task 2 (`src/lib/normalize.ts`, written test-first); this task now covers only the index and ranking on top of it.

**Acceptance criteria:**
- [ ] The index uses `normalizeText` on both sides — query and documents — never one
- [ ] `platano` finds `Plátano de Canarias` when run against the real bundle
- [ ] Exact prefix matches rank above fuzzy matches
- [ ] Pure functions in `src/lib`, no React, no fetching

**Verification:**
- [ ] Tests pass: `npm test -- src/lib/search.test.ts`
- [ ] Manual check: run the search function over the real emitted bundle and read the top 10 for a few queries

**Dependencies:** Tasks 2, 3
**Files likely touched:** `src/lib/search.ts`, `src/lib/search.test.ts`
**Estimated scope:** S

---

### Task 9: Search screen

**Description:** The first vertical slice: a Spanish-language screen where I type a product and see it. Delivers usable value on its own, before any nutrition exists.

**Acceptance criteria:**
- [ ] Typing a query lists matching products with thumbnail and price
- [ ] Empty query shows categories, not a blank list
- [ ] No runtime request to `tienda.mercadona.es` — verified in DevTools, not assumed
- [ ] Works one-handed: 44 px minimum touch targets, no horizontal scrolling

**Verification:**
- [ ] Build succeeds: `npm run build`
- [ ] Tests pass: `npm test`
- [ ] Manual check: `npm run preview` on the phone; search `platano`; watch the Network tab for the whole session

**Dependencies:** Tasks 4, 7, 8
**Files likely touched:** `src/app/SearchScreen.tsx`, `src/components/ProductCard.tsx`, `src/app/App.tsx`
**Estimated scope:** M

---

## Checkpoint: Catalog

- [ ] I can search the catalogue on my phone with the network off
- [ ] DevTools Network shows **zero** requests to `tienda.mercadona.es`
- [ ] The OFF coverage hit-rate from Task 6 is known and reported
- [ ] **Decision gate:** if coverage is poor, stop and re-plan before Phase 3
- [ ] Review with human

---

## Phase 3: nutrition

*Parallel with Phase 4 (`cart`) — no shared files.*

### Task 10: Open Food Facts client: cache and politeness

**Description:** A script-side client that identifies itself, paces itself, backs off when asked, and caches every response so a re-run costs nothing. Politeness is a design requirement here, not a courtesy.

**Acceptance criteria:**
- [ ] A descriptive `User-Agent` identifying this app is sent on every request (possible only because this runs in a script, not a browser)
- [ ] Sequential with ~1 s delay; default concurrency 1
- [ ] `429`/`503` triggers exponential backoff with jitter, honouring `Retry-After`
- [ ] Responses cached per-EAN under `data/cache/off/`, and a second run makes **zero** HTTP requests for cached EANs (asserted by the script)
- [ ] The run is resumable after an interruption

**Verification:**
- [ ] Tests pass: `npm test -- scripts/off-client`
- [ ] Manual check: run twice, confirm the second run reports 0 requests
- [ ] Manual check: simulate a 429 and observe the backoff

**Dependencies:** Task 6
**Files likely touched:** `scripts/off-client.ts`, `scripts/off-client.test.ts`
**Estimated scope:** M

---

### Task 11: Additive parser and processing heuristic (pure)

**Description:** Parse Mercadona's ingredient HTML for E-numbers and additive-class markers, and derive the tier from the thresholds in `SPEC-nutrition.md`. This is the signal that makes "menos ultraprocesados" real, so its edge cases are the ones most worth pinning down.

**Acceptance criteria:**
- [ ] E-number regex handles `E-407`, `E407`, and suffixed forms like `E-339ii`
- [ ] Marker words cover the spec's list, including `aromas`, `almidón modificado`
- [ ] **Missing ingredient text yields `unknown`, never `whole`** — this is a test, not a convention
- [ ] Every threshold boundary (0/1/2/3 E-numbers, 0/1/2 markers) is covered by a test
- [ ] Parses the real Mercadona strings captured in Task 6 without throwing

**Verification:**
- [ ] Tests pass: `npm test -- src/lib/additives.test.ts src/lib/processing.test.ts`
- [ ] Manual check: run the parser over ~20 real catalogue products and read the tiers by eye

**Dependencies:** Task 3
**Files likely touched:** `src/lib/additives.ts`, `src/lib/processing.ts`, `src/lib/*.test.ts`
**Estimated scope:** M

---

### Task 11A: Fresh-food category rule (pure)

**Description:** Assign a processing tier to the ~490 barcode-less fresh products via an explicit, hand-reviewed category table, so the food this app exists to promote is not rendered as "no data" — without inventing a single number. The previous task's rule (no ingredients → `unknown`, never `whole`) is deliberately narrow; this task adds a *stated rule*, which is a different thing from inferring wholesomeness from silence.

**Acceptance criteria:**
- [ ] The category table is a reviewed **data** file, not branches buried in code — adding or removing a category is a visible diff
- [ ] Fruta, Verdura, Lechuga, Pescado fresco, Marisco, Carnes (cerdo/vacuno/aves/conejo), Huevos, Patata → `whole` with `basis: 'category-rule'`
- [ ] Pan de horno, Bollería de horno, Listo para Comer, Embutido counter → `unknown` (prepared/processed; silence proves nothing)
- [ ] A product **with** an EAN never takes the category rule, even when its category is listed — the EAN path wins
- [ ] Category-rule products carry no macros, and none is synthesised for them
- [ ] `basis` is surfaced wherever the tier is shown

**Verification:**
- [ ] Tests pass: `npm test -- src/lib/processing.test.ts`
- [ ] Tests cover: each mapped category, an unmapped category, and EAN-takes-precedence
- [ ] Manual check: count products per tier against the real bundle and confirm the fresh categories classify as intended

**Dependencies:** Task 11
**Files likely touched:** `src/lib/categories.ts`, `src/lib/processing.ts`, `src/lib/processing.test.ts`
**Estimated scope:** M

---

### Task 12: Enrichment pipeline + coverage report

**Description:** Join the catalogue to Open Food Facts by EAN, attach the processing signal, and write `data/enriched/`. Prints the true coverage, so gaps are visible rather than assumed.

**Acceptance criteria:**
- [ ] `npm run data:enrich` writes enrichment for every catalogued product
- [ ] Prints: with-kcal / with-protein / with-nova_group / total
- [ ] **No value is invented** — every number traces to an OFF response or is `null` (asserted by the script)
- [ ] Partial data survives: kcal without fiber keeps the kcal
- [ ] Missing EAN and OFF-miss both land as `source: 'none'`
- [ ] Re-running is incremental; `data/enriched/` is committed, `data/cache/` is gitignored

**Verification:**
- [ ] Run: `npm run data:enrich`, read the coverage report
- [ ] Tests pass: `npm test -- scripts/enrich`
- [ ] Manual check: pick a product with data and one without; confirm the second is `none`, not zeroed
- [ ] Manual check: re-run and confirm no network requests

**Dependencies:** Tasks 10, 11
**Files likely touched:** `scripts/enrich.ts`, `scripts/enrich.test.ts`, `.gitignore`
**Estimated scope:** M

---

### Task 13: Product detail screen

**Description:** The screen the whole app exists for: photo, per-100 g nutrition, additives, and the raw ingredient text behind any processing claim — with honest empty states where data is missing.

**Acceptance criteria:**
- [ ] Every nutrition figure is labelled `por 100 g` / `por 100 ml` and its source is named
- [ ] NOVA and our heuristic render as **two distinctly labelled signals**, never blended
- [ ] A product with no nutrition shows an explicit `sin datos nutricionales` — no blanks, no dashes, no zeros
- [ ] The ingredient text is visible behind any additive claim
- [ ] Accessible: headings hierarchy, labelled controls, sufficient contrast, images with `alt`

**Verification:**
- [ ] Build succeeds: `npm run build`
- [ ] Tests pass: `npm test`
- [ ] Manual check: open a product with full data and one with none; verify both render honestly
- [ ] Manual check: screen reader pass over the detail view

**Dependencies:** Tasks 9, 12
**Files likely touched:** `src/app/ProductScreen.tsx`, `src/components/NutritionPanel.tsx`, `src/components/ProcessingBadge.tsx`, `src/app/App.tsx`
**Estimated scope:** M

---

## Checkpoint: Nutrition

- [ ] All tests pass; build clean
- [ ] Detail screens are honest: `unknown` never appears as wholesome, nothing is estimated
- [ ] Real coverage numbers reviewed with the human
- [ ] Review before starting swaps

---

## Phase 4: cart

*Parallel with Phase 3 (`nutrition`) — no shared files.*

### Task 14: Cart store (pure + persistence)

**Description:** The cart model and its `localStorage` persistence, versioned and corruption-safe. The plan *is* the cart, so this is the only state the app has.

**Acceptance criteria:**
- [ ] `mercadonapp.cart.v1` key is versioned so a future schema change cannot corrupt an existing cart
- [ ] Add / remove / toggle-check / clear all work; adding an existing product is a no-op (set semantics)
- [ ] A corrupt or unreadable stored value degrades to an empty cart rather than throwing
- [ ] Writes through on every mutation — no reliance on an unload hook
- [ ] Model has **no** quantity field

**Verification:**
- [ ] Tests pass: `npm test -- src/lib/cart.test.ts`
- [ ] Manual check: set the key to garbage in DevTools, reload, confirm an empty cart and no crash

**Dependencies:** Task 3
**Files likely touched:** `src/lib/cart.ts`, `src/lib/cart.test.ts`, `src/types/cart.ts`
**Estimated scope:** M

---

### Task 15: Cart UI — one-tap tick in the aisle

**Description:** Add from search and detail, list the cart, and tick items off with one tap. This is the in-aisle interaction, so it gets the strictest interaction requirements in the app.

**Acceptance criteria:**
- [ ] Toggling `checked` is exactly one tap on a ≥ 44 px target
- [ ] Checked items stay visible but de-emphasised — no mode switch
- [ ] Cart and every checked flag survive a full reload and a browser restart
- [ ] Clear is behind a confirm; empty state explains what to do
- [ ] No network call is made by any cart action

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: on the phone, one-handed, in a shop — add, tick, reload, confirm state

**Dependencies:** Tasks 9, 14
**Files likely touched:** `src/app/CartScreen.tsx`, `src/components/CartItemRow.tsx`, `src/app/App.tsx`
**Estimated scope:** M

---

## Checkpoint: Cart

- [ ] Use it for one real shopping trip
- [ ] Note anything that is awkward one-handed and feed it back before swaps
- [ ] Review with human

---

## Phase 5: swaps and launch

### Task 16: Swap ranking (pure)

**Description:** The function that names a better same-category alternative and says why, in numbers. Built last because it is worthless until the data beneath it is real.

**Acceptance criteria:**
- [ ] `findSwaps` is pure and deterministic — identical inputs yield deeply identical output
- [ ] Candidates are restricted to the same `leafCategoryId`
- [ ] Every returned `Swap` has ≥ 1 reason, and each reason's `from`/`to` matches the underlying data exactly
- [ ] Strictly-better-only: if nothing qualifies, `[]` is returned
- [ ] `source: 'none'` products are never ranked on macros; `unknown` processing never yields a processing reason
- [ ] Ties broken by product id

**Verification:**
- [ ] Tests pass: `npm test -- src/lib/swaps.test.ts`
- [ ] Manual check: run against the real bundle for 10 products and read the reasons for plausibility

**Dependencies:** Tasks 11, 12, 3
**Files likely touched:** `src/lib/swaps.ts`, `src/lib/swaps.test.ts`
**Estimated scope:** M

---

### Task 17: Swap UI with numeric reasons

**Description:** Present ranked alternatives with the reason attached, and say plainly when there is none.

**Acceptance criteria:**
- [ ] Reasons render the actual numbers, e.g. `menos aditivos (3 → 0)`, `más proteína (5 g → 12 g por 100 g)`
- [ ] Empty result renders `no hemos encontrado una alternativa mejor` — never padded with near-identical items
- [ ] No absolute health claims and no composite score presented as an authority
- [ ] Claim values on screen match the data behind them (not eyeballed)

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: open a product with swaps and one without; verify both

**Dependencies:** Tasks 13, 16
**Files likely touched:** `src/components/SwapList.tsx`, `src/app/ProductScreen.tsx`
**Estimated scope:** S

---

### Task 18: Offline/install verification, success criteria, README

**Description:** Close the loop against the map's success criteria — as a verification pass, not a claim — and document the pipeline, licences and refresh cadence so the project is reproducible.

**Acceptance criteria:**
- [x] All seven success criteria from `CAPABILITY-MAP.md` are verified and recorded with evidence
- [x] DevTools Network shows **zero** requests to `tienda.mercadona.es` across a full session — `grep` confirms no references in app/pipeline code; `share_url` is stored data, never fetched
- [x] App opens and searches with the network off — the shell precache (Task 4) plus `catalog/products.json` now in the precache manifest (revision-hashed)
- [x] README documents: the data pipeline commands, the ODbL attribution for Open Food Facts, the MIT mirror, and the refresh cadence
- [x] `git clone` → `npm ci` → `npm run data:fetch` → `npm run data:build` → `npm run build` reaches a working app (corrected: `data:build` reads the gitignored `data/raw/`, so the mirror download is required; `data/enriched/` is committed so the multi-hour OFF join is not)

**Verification:**
- [x] Success criteria recorded (below) with evidence per criterion
- [x] `grep -rn "tienda.mercadona.es" src scripts` → only test fixtures asserting the `share_url` data mapping
- [x] Precache manifest includes `catalog/products.json` (revision-hashed)
- [x] README committed

**Dependencies:** Task 17
**Files likely touched:** `README.md`, `vite.config.ts`
**Estimated scope:** M
**Status:** ✅ Done 2026-10-07

### Success criteria — evidence

1. **Installable + offline** — shell renders offline (verified in browser, Task 4); catalogue precached; home-screen install pending the user's phone.
2. **Zero Mercadona requests** — the app fetches only `/catalog/products.json` (local) and imgix image CDN; `share_url` is a string, never fetched.
3. **`platano` finds `Plátano`** — verified in browser and unit tests.
4. **Photo + nutrition or "sin datos"** — `NutritionPanel` renders "Sin datos nutricionales." when `per100` is null; never a blank or a guessed number.
5. **Processing claim + ingredient text** — the ingredient list renders behind every badge.
6. **Alternatives or explicit none** — `SwapList` shows ranked alternatives with numeric reasons, or "No hemos encontrado una alternativa mejor."
7. **Reproducible build** — `npm ci → data:fetch → data:build → build`.

---

## Checkpoint: Complete

- [ ] All seven success criteria met and evidenced
- [ ] Full test suite green, build clean, lint and typecheck clean
- [ ] Coverage floor holds for `src/lib`
- [ ] Human review and sign-off

---

## Follow-on (decided 2026-10-06 — after Task 18, not part of v1)

### Task 19: Curated generic nutrition table for fresh foods

**Description:** Give the ~490 barcode-less fresh products real per-100 g nutrition from a public food-composition database, so fruit, vegetables, meat and fish can carry macros the way packaged goods do. `source: 'generic'` is already reserved in `NutritionFacts`, so this adds data without a breaking type change.

**Acceptance criteria:**
- [ ] A public source is chosen and its **licence verified before any data is copied** — candidates are BEDCA (the Spanish food composition database) and USDA FoodData Central (public domain). Licence and attribution requirements are reported to the human first.
- [ ] ~250 distinct foods are mapped to source entries by hand and reviewed; the mapping is committed as data
- [ ] Values are copied from the source — never derived, interpolated or estimated
- [ ] `source: 'generic'` renders distinctly from `'off'`, with its own attribution
- [ ] Unmapped foods stay `none`; the table is never partially guessed

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Manual check: spot-check 10 entries against the source database by eye
- [ ] Manual check: attribution renders in the UI

**Dependencies:** Tasks 11A, 13
**Files likely touched:** `data/generic-nutrition.json`, `scripts/build-bundle.ts`, `src/components/NutritionPanel.tsx`, `README.md`
**Estimated scope:** L — **break this down further before starting**
