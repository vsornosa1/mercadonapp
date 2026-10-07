import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { isFoodProduct } from '../src/lib/alternatives.ts';
import { buildSwapSignals, findSwaps } from '../src/lib/swaps.ts';
import type { EnrichedCatalogProduct } from '../src/types/catalog.ts';
import type { ProcessingTier } from '../src/types/nutrition.ts';

/**
 * Evidence tool for SPEC-alternatives.md. Reproduces every number in §2 of that
 * spec, so the success criteria can be re-measured after the fix rather than
 * asserted. Run: node scripts/audit-alternatives.ts
 *
 * IMPORTANT: `unknown` is NEUTRAL here, never "lowest". Treating it as lowest
 * makes an unknown product look worse than a whole one and invents defects.
 */

const products = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '..', 'public', 'catalog', 'products.json'), 'utf8'),
) as EnrichedCatalogProduct[];

const signals = buildSwapSignals(products);
const byId = new Map(products.map((p) => [p.id, p]));

/**
 * NOTE: `Swap.product` is typed `CatalogProduct`, which has no `processing`
 * field, so the tier has to be looked up by id here. The UI needs the tier too
 * (it shows the badge), so SPEC-alternatives.md §3.1 tightens this to
 * `EnrichedCatalogProduct`.
 */
const tierOf = (id: number): ProcessingTier => byId.get(id)?.processing.tier ?? 'unknown';

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

let worseTierRecommendations = 0;
let betterTierRecommendations = 0;
let sameTierRecommendations = 0;
let recommendations = 0;

const noSwap: EnrichedCatalogProduct[] = [];
let betterTierUnprovable = 0;
let betterTierBlockedByPareto = 0;
let noComparablePeer = 0;
let alreadyBestTier = 0;

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
    recommendations += 1;
    const deltas = swaps
      .map((s) => tierDelta(p.processing.tier, tierOf(s.product.id)))
      .filter((d): d is number => d !== null);
    if (deltas.some((d) => d > 0)) worseTierRecommendations += 1;
    else if (deltas.some((d) => d < 0)) betterTierRecommendations += 1;
    else sameTierRecommendations += 1;
    continue;
  }

  noSwap.push(p);

  const own = signals.get(p.id)!;
  const ownRank = TIER_RANK[p.processing.tier];
  if (!peers.some(hasData)) {
    noComparablePeer += 1;
    continue;
  }

  const betterTierPeers = peers.filter((c) => {
    const d = tierDelta(p.processing.tier, c.processing.tier);
    return d !== null && d < 0;
  });
  if (betterTierPeers.length === 0) {
    alreadyBestTier += 1;
    continue;
  }

  const isWorseOn = (c: EnrichedCatalogProduct): boolean => {
    const cs = signals.get(c.id)!;
    return (
      (own.additiveCount !== null && cs.additiveCount !== null && cs.additiveCount > own.additiveCount) ||
      (own.novaGroup !== null && cs.novaGroup !== null && cs.novaGroup > own.novaGroup) ||
      (own.protein !== null && cs.protein !== null && cs.protein < own.protein) ||
      (own.sugars !== null && cs.sugars !== null && cs.sugars > own.sugars) ||
      (own.salt !== null && cs.salt !== null && cs.salt > own.salt)
    );
  };

  // Group A: a better-tier peer that is worse on NOTHING -> a tier reason alone fixes it.
  // Group B: better-tier peers exist but every one is worse on >=1 dimension -> needs a
  //          disclosed trade-off to be offered at all.
  if (betterTierPeers.some((c) => !isWorseOn(c))) betterTierUnprovable += 1;
  else betterTierBlockedByPareto += 1;

  void ownRank;
}

const tierCounts: Record<string, number> = {};
for (const p of products) tierCounts[p.processing.tier] = (tierCounts[p.processing.tier] ?? 0) + 1;

console.log('=== SPEC-alternatives.md §2 evidence ===');
console.log(`products total                       : ${products.length}`);
console.log(`  food / non-food                    : ${food.length} / ${nonFood}`);
console.log(`food with recommendations            : ${recommendations}`);
console.log(`food without recommendations         : ${noSwap.length}`);
console.log('');
console.log(`§2.1 recommendations with WORSE tier : ${worseTierRecommendations}   (target 0)`);
console.log(`§2   recommendations improving tier  : ${betterTierRecommendations}`);
console.log(`§2.3 same-tier-only recommendations  : ${sameTierRecommendations}`);
console.log('');
console.log(`§2.2 better-tier peer, NO provable reason : ${betterTierUnprovable}`);
console.log(`§2.2 better-tier peer, blocked by Pareto  : ${betterTierBlockedByPareto}`);
console.log(`§2.2 no comparable peer in leaf           : ${noComparablePeer}`);
console.log(`     already the best tier available      : ${alreadyBestTier}`);
console.log('');
console.log('tier distribution across all products:', tierCounts);
