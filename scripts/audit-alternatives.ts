import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { isFoodProduct } from '../src/lib/alternatives.ts';
import { compare, buildSwapSignals, findSwaps } from '../src/lib/swaps.ts';
import { tierLabel } from '../src/lib/tier-labels.ts';
import type { EnrichedCatalogProduct } from '../src/types/catalog.ts';
import type { ProcessingTier } from '../src/types/nutrition.ts';

/**
 * Evidence tool for SPEC-alternatives.md. Reproduces every number in §2 and
 * re-measures §9 after a change, so the success criteria are verified rather
 * than asserted. Run: node scripts/audit-alternatives.ts
 *
 * IMPORTANT: `unknown` is NEUTRAL here, never "lowest". Treating it as lowest
 * makes an unknown product look worse than a whole one and invents defects.
 */

const products = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '..', 'public', 'catalog', 'products.json'), 'utf8'),
) as EnrichedCatalogProduct[];

const signals = buildSwapSignals(products);
const byLeaf = new Map<number, EnrichedCatalogProduct[]>();
for (const p of products) {
  const list = byLeaf.get(p.leafCategoryId) ?? [];
  list.push(p);
  byLeaf.set(p.leafCategoryId, list);
}
const peersOf = (p: EnrichedCatalogProduct) =>
  (byLeaf.get(p.leafCategoryId) ?? []).filter((c) => c.id !== p.id);

/** null = not comparable. `unknown` is null so it never counts as better or worse. */
const TIER_RANK: Record<ProcessingTier, number | null> = {
  whole: 0,
  processed: 1,
  'ultra-processed': 2,
  unknown: null,
};

const tierDelta = (from: ProcessingTier, to: ProcessingTier): number | null => {
  const a = TIER_RANK[from];
  const b = TIER_RANK[to];
  return a === null || b === null ? null : b - a;
};

const food = products.filter((p) => isFoodProduct(p.categoryPath));
const nonFood = products.length - food.length;

let withSwaps = 0;
let worseTierRecommendations = 0;
let betterTierRecommendations = 0;
let sameTierRecommendations = 0;
let recommendationsWithCost = 0;
let recommendationsWithTierReason = 0;
let unknownAsImprovement = 0;

const noSwap = { noComparablePeer: 0, alreadyBestTier: 0, betterTierRejected: 0 };

const hasData = (c: EnrichedCatalogProduct) => {
  const s = signals.get(c.id);
  return (
    !!s &&
    (s.additiveCount !== null ||
      s.novaGroup !== null ||
      s.protein !== null ||
      s.sugars !== null ||
      s.salt !== null)
  );
};

for (const p of food) {
  const peers = peersOf(p);
  const swaps = findSwaps(p, peers, signals, 3);

  if (swaps.length > 0) {
    withSwaps += 1;
    let anyBetter = false;
    for (const s of swaps) {
      const delta = tierDelta(p.processing.tier, s.product.processing.tier);
      if (delta !== null && delta > 0) worseTierRecommendations += 1;
      if (delta !== null && delta < 0) anyBetter = true;
      if (s.cost) recommendationsWithCost += 1;
      for (const reason of s.reasons) {
        if (reason.kind === 'tier') {
          recommendationsWithTierReason += 1;
          if (reason.from === 'unknown' || reason.to === 'unknown') unknownAsImprovement += 1;
        }
      }
    }
    if (anyBetter) betterTierRecommendations += 1;
    else sameTierRecommendations += 1;
    continue;
  }

  // No recommendation: why?
  if (!peers.some(hasData)) {
    noSwap.noComparablePeer += 1;
    continue;
  }
  const betterTierPeerExists = peers.some((c) => {
    const d = tierDelta(p.processing.tier, c.processing.tier);
    return d !== null && d < 0;
  });
  if (betterTierPeerExists) noSwap.betterTierRejected += 1;
  else noSwap.alreadyBestTier += 1;
}

const tierCounts: Record<string, number> = {};
for (const p of products) tierCounts[p.processing.tier] = (tierCounts[p.processing.tier] ?? 0) + 1;

/**
 * The achievable ceiling, derived from the acceptance rules rather than guessed:
 * a product could be offered a recommendation iff some better-tier peer exists
 * that regresses on no processing dimension and on at most one macro.
 */
function hasAcceptableBetterTierPeer(p: EnrichedCatalogProduct): boolean {
  const own = signals.get(p.id);
  if (!own) return false;
  for (const c of peersOf(p)) {
    const cs = signals.get(c.id);
    if (!cs) continue;
    const delta = tierDelta(p.processing.tier, c.processing.tier);
    if (delta === null || delta >= 0) continue;
    const processingWorse =
      compare(cs, own, 'tier') === 1 ||
      compare(cs, own, 'additives') === 1 ||
      compare(cs, own, 'nova') === 1;
    if (processingWorse) continue;
    const macroWorse = ['protein', 'sugars', 'salt'].filter(
      (d) => compare(cs, own, d as 'protein') === 1,
    ).length;
    if (macroWorse <= 1) return true;
  }
  return false;
}

let achievable = 0;
let unofferedButAchievable = 0;
for (const p of food) {
  if (!hasAcceptableBetterTierPeer(p)) continue;
  achievable += 1;
  if (findSwaps(p, peersOf(p), signals, 3).length === 0) unofferedButAchievable += 1;
}

// Criterion 6 is about the rendered label, so measure the label function itself.
const tierBases = [
  ['whole', 'off-nova'],
  ['processed', 'off-nova'],
  ['ultra-processed', 'off-nova'],
  ['whole', 'ingredient-heuristic'],
  ['processed', 'ingredient-heuristic'],
  ['ultra-processed', 'ingredient-heuristic'],
  ['whole', 'category-rule'],
  ['unknown', 'category-rule'],
] as const;
const overclaimingLabels = tierBases.filter(([tier, basis]) =>
  tierLabel(tier, basis).toLowerCase().includes('alimento entero'),
).length;

const check = (label: string, ok: boolean, detail: string) =>
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(54)} ${detail}`);

console.log('=== SPEC-alternatives.md §9 — success criteria ===');
check(
  '1. recommendations with a WORSE tier',
  worseTierRecommendations === 0,
  `${worseTierRecommendations} (target 0)`,
);
check(
  '2+3. a better-tier peer that is acceptable is always offered',
  unofferedButAchievable === 0,
  `${unofferedButAchievable} of ${achievable} achievable (target 0)`,
);
check(
  '4. offered recommendations reach the achievable ceiling',
  betterTierRecommendations >= achievable,
  `${betterTierRecommendations} offered / ${achievable} achievable`,
);
check(
  '5. reasons using `unknown` as an improvement',
  unknownAsImprovement === 0,
  `${unknownAsImprovement} (target 0)`,
);
check(
  '6. no label presents a heuristic tier as a whole-food claim',
  overclaimingLabels === 0,
  `${overclaimingLabels} of ${tierBases.length} (tier, basis) combinations`,
);
console.log('');
console.log('=== detail ===');
console.log(`products total / food / non-food      : ${products.length} / ${food.length} / ${nonFood}`);
console.log(`food with recommendations             : ${withSwaps}`);
console.log(`  improving the tier                  : ${betterTierRecommendations}`);
console.log(`  same tier only (macro swaps)        : ${sameTierRecommendations}`);
console.log(`  recommendations carrying a cost     : ${recommendationsWithCost}`);
console.log(`  tier reasons emitted                : ${recommendationsWithTierReason}`);
console.log('');
console.log('food WITHOUT recommendations, by reason:');
console.log(`  no comparable peer                  : ${noSwap.noComparablePeer}`);
console.log(`  already the best tier available     : ${noSwap.alreadyBestTier}`);
console.log(`  better-tier peer existed but all were rejected: ${noSwap.betterTierRejected}`);
console.log(`     (each had >1 macro regression, or a processing regression)`);
console.log('');
console.log('tier distribution:', tierCounts);
