export type NutritionSource = 'off' | 'generic' | 'none'; // 'generic' is reserved: fresh-food composition table follow-on
export type ProcessingBasis = 'off-nova' | 'ingredient-heuristic' | 'category-rule';
export type ProcessingTier = 'unknown' | 'whole' | 'processed' | 'ultra-processed';
export type NovaGroup = 1 | 2 | 3 | 4;

export interface NutritionFacts {
  source: NutritionSource;
  offCode?: string;
  per100: {
    // per 100 g / 100 ml, any field may be null — missing data is null, never zero
    kcal: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    saturatedFat: number | null;
    sugars: number | null;
    salt: number | null;
    fiber: number | null;
  } | null;
  novaGroup: NovaGroup | null; // OFF's own scale, authoritative, often absent
  additives: { code: string; label: string | null }[]; // normalised E-numbers
}

export interface ProcessingSignal {
  basis: ProcessingBasis;
  tier: ProcessingTier;
  additiveMarkers: string[]; // the words that triggered it, so it can be shown
}

export type NutritionIndex = ReadonlyMap<number, NutritionFacts>;
