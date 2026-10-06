# Implementation Plan: Mercadona Nutrition Assistant

Date: 2026-10-06 · Source of truth: [CAPABILITY-MAP.md](./../.agents/docs/intent/CAPABILITY-MAP.md) and the four `SPEC-*.md` files

> Task list target: **`tasks/todo.md`** (the skill default; no external tracker is designated in this repo).

## Overview

A static, installable PWA that tells me what is really in the products I buy at Mercadona — per-100 g nutrition, additives, and a processing signal — and names a better same-category alternative. Four modules in dependency order: `catalog` → (`nutrition` ∥ `cart`) → `swaps`. No backend: catalogue and nutrition are resolved at build time, so the app makes **no runtime requests to Mercadona or Open Food Facts** — only to image CDNs.

## Architecture Decisions

1. **Static PWA, no server.** Vite + React + TypeScript. All data baked in. Chosen because the app has one user, no accounts, no SEO, and no dynamic data — a server would be machinery with no payoff.
2. **Catalogue from the Hugging Face mirror `datania/mercadona-catalog`, never scraped.** Mercadona's `robots.txt` disallows `/api` and its abuse detector hard-blocked an IP after ~4,500 rapid requests. A build-time mirror download removes the exposure entirely.
3. **Nutrition resolved at build time, not at runtime.** Open Food Facts is queried from a script (descriptive User-Agent, ~1 s delay, resumable per-EAN cache), and the result is committed. A browser cannot set a User-Agent, so runtime OFF calls would breach OFF's stated policy and hit its 100 req/min limit; build-time enrichment avoids both and gives instant search.
4. **Two distinct processing signals, never blended.** OFF's `nova_group` where it exists (authoritative, often absent); our ingredient/E-number heuristic where it does not (always available, and ours). Presented as separate, labelled signals. No composite health score, ever.
5. **`unknown` is a first-class value.** No ingredient list is not evidence of wholesomeness; a missing macro is not zero. Nothing is ever estimated or interpolated. The one exception is an explicit, hand-reviewed **category rule** for barcode-less fresh foods (`basis: 'category-rule'`), which is a stated rule rather than an inference from silence — added after measuring that all 490 fresh products have no EAN and would otherwise show as "no data".
6. **Pure logic in `src/lib`, network only in `scripts/`.** The tested core is pure functions taking data as arguments — that is what makes the risky logic cheap to verify.
7. **Cart is a set in `localStorage`.** No quantities, no totals: basket totals are explicitly out of scope, so the model has no field to drift into.
8. **Vertical slices, not layers.** Every phase ends with something usable on the phone, rather than "all the data, then all the logic, then all the UI".

## Dependency graph

```
repo scaffold ──┬── domain types ──────────────────────────┐
                │                                          │
                └── PWA shell                              │
                                                           │
mirror fetch ──┬── OFF coverage spike (FAIL FAST)          │
               │                                           │
               └── slim bundle ──┐                         │
                                 ├── search index ── search screen
                    (types) ─────┘                         │
                                                           │
OFF spike ── OFF client ──┐                                │
                          ├── enrichment ──┐               │
ingredient parser ────────┘                │               │
                                           └── detail screen
                                                           │
(cart store) ── cart UI ───────────────────────────────────┤
                                                           │
(parser, enrichment) ── swap ranking ── swap UI ── offline + verify
```

## Task List (ordered index)

Full task definitions — acceptance criteria, verification, dependencies, files — live in `tasks/todo.md`. This is the index, not a duplicate.

| # | Task | Module | Phase |
|---|---|---|---|
| 1 | Scaffold Vite + React + TypeScript | — | Foundation |
| 2 | Test and lint tooling, with the coverage floor | — | Foundation |
| 3 | Domain types from the specs | — | Foundation |
| 4 | PWA shell — installable, offline app shell | — | Foundation |
| 5 | Fetch the catalogue mirror | `catalog` | Catalog |
| 6 | **OFF coverage spike (fail fast)** | `nutrition` | Catalog |
| 7 | Emit slim catalogue bundle + gzip budget | `catalog` | Catalog |
| 8 | Search normalisation and index (pure) | `catalog` | Catalog |
| 9 | Search screen | `catalog` | Catalog |
| 10 | Open Food Facts client: cache and politeness | `nutrition` | Nutrition |
| 11 | Additive parser and processing heuristic (pure) | `nutrition` | Nutrition |
| 11A | Fresh-food category rule (pure) | `nutrition` | Nutrition |
| 12 | Enrichment pipeline + coverage report | `nutrition` | Nutrition |
| 13 | Product detail screen | `nutrition` | Nutrition |
| 14 | Cart store (pure + persistence) | `cart` | Cart |
| 15 | Cart UI — one-tap tick in the aisle | `cart` | Cart |
| 16 | Swap ranking (pure) | `swaps` | Swaps |
| 17 | Swap UI with numeric reasons | `swaps` | Swaps |
| 18 | Offline/install verification, success criteria, README | — | Launch |
| 19 | *Follow-on:* curated generic nutrition table for fresh foods | `nutrition` | After v1 |

Task 19 is a follow-on agreed on 2026-10-06 — deliberately outside v1, and sized **L**, so it must be broken down further before anyone starts it.

### Checkpoints

- **After 1–4 (Foundation):** builds, tests, lints, installable shell. Review before touching data.
- **After 5–9 (Catalog):** I can search the catalogue on my phone, and the OFF coverage number is known. **This is the decision point** — if `Task 6` shows poor OFF coverage, stop and re-decide the nutrition approach before building UI.
- **After 10–13 (Nutrition):** detail screens are honest about gaps. Review real coverage numbers with the human.
- **After 14–15 (Cart):** use it for an actual shop before building swaps.
- **After 16–18 (Complete):** all seven success criteria verified and recorded.

## Parallelization

After Checkpoint 2, two independent streams:

- **Stream A (`nutrition`):** Tasks 10 → 11 → 12 → 13
- **Stream B (`cart`):** Tasks 14 → 15

They share only `src/types` (frozen at Task 3) and the search screen (Task 9, done). No shared files. Task 15 depends on Task 9, not on `nutrition`, which is exactly why the map put `cart` parallel to `nutrition`.

Task 16 must wait for both streams.

## Finding (2026-10-06): measured against the real mirror, not the proxy

The research proxy (`brands_tags=hacendado` → ~10,918 products, 100/100 macro completeness) measured Open Food Facts' *own* dataset — including historical and discontinued products — not Mercadona's *current* catalogue. Task 6 measured the real overlap with a seeded, stratified sample of 250 live EANs.

**The decisive result: OFF covers only a minority of the current catalogue.**

| Segment | OFF coverage (measured) |
|---|---|
| Variable-weight / fresh (EAN prefix `210…`) | **0%** — OFF has no PLU codes |
| Packaged, all brands | **~25–35%** (first run undercounted at ~17% — see below) |
| Packaged Hacendado | higher than the overall figure |
| Packaged third-party brands | lower |

**Correction to an earlier assumption:** fresh produce *does* have EANs in its detail files (`Plátano de Canarias IGP` → `2105410038198`) — my "no barcode" phrasing came from the leaf-listing shape. But those are store variable-weight PLU codes that Open Food Facts will never contain, so the practical consequence is unchanged: **fresh foods get 0% macros from OFF**.

**The first spike run undercounted.** Its buggy path marked any non-OK response (including transient 429s) as "not found"; manually re-verifying three such EANs showed all three actually present in OFF. The spike was corrected to use the retry/backoff OFF client (`off-client.ts`) and needs one quiet re-run for the exact figure — the order of magnitude is not in question.

**The counterweight that saves the product:** the app's primary value — "fewer ultraprocesados" — comes from Mercadona's *own* ingredient data (E-numbers and additive markers), present for 2,754/4,330 products (**64%**). Macros (OFF) are the secondary feature; the additive signal is the primary one, and it does not depend on OFF at all.

**Decision gate (Checkpoint 2):** OFF coverage is poor for macros (~a quarter to a third of packaged products, zero fresh). The plan said to stop and re-decide before Phase 3. The architecture already has the fallback (category rule + generic table for fresh), but the user should choose how to weight macros vs. the additive signal in the UI given this measured reality.

**Also measured:** the mirror's `product_ids.json` lists two ids (`24565`, `24585`) with no product file — they 404 on the mirror but still appear in the category tree. Task 5 tolerates them; 4,330/4,332 products landed.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| OFF coverage is worse than the brand-level proxy (~10,918 Hacendado products, 100/100 macro completeness in a sample) suggests — a spot-checked live EAN was already missing | **High** | Task 6 measures the real hit-rate before any UI exists. Fail fast, re-decide, don't discover it at the end |
| Mirror disappears, rotates, or stops updating | Med | Raw snapshot cached locally and re-downloadable; `data/enriched/` committed so a rebuild needs no network at all; document how to re-point |
| Bundle too large for a phone on mobile data | Med | Gzip budget enforced by the build script (fails above 1.5 MB), measured not guessed |
| The ingredient heuristic makes a wrong "ultraprocesado" call on a real product | Med | Raw ingredient text always shown behind the claim; boundary tests against real Mercadona strings captured in Task 6 |
| `.agents/` is pinned by `skills-lock.json`; project docs inside it could be clobbered by a skill re-sync | Med | Already flagged; move project docs to `docs/` before implementation starts |
| Scope creep — variety, recipes, quantities, price tracking all surfaced during the interview | Med | Explicit out-of-scope list in the map; new ideas go to Open Questions, not into a task |
| PWA service worker caches a stale bundle and hides updates | Low | Versioned cache; `npm run preview` is the verification surface, not the dev server |

## Open Questions

Unchanged from the map — none blocks Task 1, but **Q1–Q4 change scope and should be answered before Checkpoint 2**:

1. **Variety** — the plan delivers four modules and no variety signal. You named variety as a goal but it is not in the confirmed outcome. If you want it in v1, that is a fifth module and this plan needs revising before we start.
2. **Swap scope** — plan assumes same-leaf-category only (per `SPEC-swaps.md`). Cross-category swaps are a different, larger feature.
3. **Two processing scales** — plan assumes NOVA and our heuristic are shown as two distinctly labelled signals. A single blended badge would change Tasks 13, 17 and the honesty boundary.
4. **Cart ordering** — plan assumes insertion order; grouping by category is the alternative and it changes in-aisle behaviour.
5. **`data/enriched/` committed to git** — plan assumes yes (it is the slow, polite step; committing it makes rebuilds offline and cheap). Puts a few MB of derived data in the repo.
6. **Where plan and task files live** — this plan uses the skill default `tasks/` at the repo root, while your specs now live under `.agents/docs/`. Say the word and I'll relocate these to match.
