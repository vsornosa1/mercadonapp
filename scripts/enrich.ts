import type { NovaGroup, NutritionFacts, ProcessingSignal } from '../src/types/nutrition.ts';
import { categoryRuleSignal } from '../src/lib/category-rules.ts';
import { classifyProcessing } from '../src/lib/processing.ts';
import type { CategoryPath } from './category-index.ts';
import type { RawProduct } from './summarize.ts';

export interface EnrichedProduct {
  id: number;
  nutrition: NutritionFacts;
  processing: ProcessingSignal;
}

function noneNutrition(): NutritionFacts {
  return { source: 'none', per100: null, novaGroup: null, additives: [] };
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function novaGroupOf(offJson: unknown): NovaGroup | null {
  const raw = (offJson as { product?: { nova_group?: unknown } }).product?.nova_group;
  const n = typeof raw === 'string' ? Number.parseFloat(raw) : raw;
  return n === 1 || n === 2 || n === 3 || n === 4 ? (n as NovaGroup) : null;
}

function mapAdditives(tags: unknown): { code: string; label: string | null }[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((t): t is string => typeof t === 'string')
    .map((tag) => ({ code: tag.replace(/^en:/, '').toUpperCase(), label: null }));
}

/** Maps an OFF v2 product response to NutritionFacts, preserving partial data. */
export function mapOffToNutrition(offJson: unknown, ean: string): NutritionFacts {
  const obj = offJson as {
    status?: unknown;
    product?: { nutriments?: Record<string, unknown>; additives_tags?: unknown };
  };
  if (obj.status !== 1 && obj.status !== '1') return noneNutrition();

  const n = obj.product?.nutriments ?? {};
  return {
    source: 'off',
    offCode: ean,
    per100: {
      kcal: num(n['energy-kcal_100g']),
      protein: num(n['proteins_100g']),
      carbs: num(n['carbohydrates_100g']),
      fat: num(n['fat_100g']),
      saturatedFat: num(n['saturated-fat_100g']),
      sugars: num(n['sugars_100g']),
      salt: num(n['salt_100g']),
      fiber: num(n['fiber_100g']),
    },
    novaGroup: novaGroupOf(offJson),
    additives: mapAdditives(obj.product?.additives_tags),
  };
}

export function novaTier(group: NovaGroup): ProcessingSignal['tier'] {
  if (group === 1) return 'whole';
  if (group === 4) return 'ultra-processed';
  return 'processed';
}

/**
 * Composes the processing signal with a strict precedence: OFF's nova_group
 * (authoritative) → our ingredient heuristic (from Mercadona) → the category
 * rule (fresh counters) → unknown. Never blended, and basis is always set.
 */
export function composeProcessing(
  offJson: unknown,
  ingredientsHtml: string | null,
  categoryNames: readonly string[],
): ProcessingSignal {
  const nova = novaGroupOf(offJson);
  if (nova !== null) {
    return { basis: 'off-nova', tier: novaTier(nova), additiveMarkers: [] };
  }
  if (ingredientsHtml && ingredientsHtml.trim() !== '') {
    return classifyProcessing(ingredientsHtml);
  }
  const categorySignal = categoryRuleSignal(categoryNames);
  if (categorySignal) return categorySignal;
  return { basis: 'ingredient-heuristic', tier: 'unknown', additiveMarkers: [] };
}

export function enrichProduct(
  raw: RawProduct,
  lineage: CategoryPath | undefined,
  offJson: unknown,
): EnrichedProduct {
  const id = Number(raw.id);
  const ean = raw.ean ?? '';
  const categoryNames = lineage ? [lineage.topLevelName, lineage.leafName] : [];
  return {
    id,
    nutrition: ean ? mapOffToNutrition(offJson, ean) : noneNutrition(),
    processing: composeProcessing(
      offJson,
      raw.nutrition_information?.ingredients ?? null,
      categoryNames,
    ),
  };
}
