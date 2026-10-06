import { describe, expectTypeOf, it } from 'vitest';

import type { Cart, CartItem } from './cart';
import type { CatalogProduct } from './catalog';
import type { NutritionFacts, NutritionIndex, ProcessingSignal } from './nutrition';
import type { Reason, Swap } from './swaps';

// Compile-level contract tests. Task 3 freezes these interfaces so the nutrition
// and cart work streams can build in parallel without drifting. A widening here
// must fail `npm run typecheck` — that is the test.
describe('domain type contracts', () => {
  it('freezes ean as string | null — fresh produce has no barcode, and null must be tolerated', () => {
    expectTypeOf<CatalogProduct['ean']>().toEqualTypeOf<string | null>();
  });

  it('freezes every per-100 nutrition field as number | null — missing data is null, never zero', () => {
    type Per100 = NonNullable<NutritionFacts['per100']>;
    expectTypeOf<Per100['kcal']>().toEqualTypeOf<number | null>();
    expectTypeOf<Per100['fiber']>().toEqualTypeOf<number | null>();
  });

  it('reserves the generic source for the fresh-food composition table follow-on', () => {
    expectTypeOf<NutritionFacts['source']>().toEqualTypeOf<'off' | 'generic' | 'none'>();
  });

  it('freezes the three processing bases — a category rule is never presented as a measured signal', () => {
    expectTypeOf<ProcessingSignal['basis']>().toEqualTypeOf<
      'off-nova' | 'ingredient-heuristic' | 'category-rule'
    >();
  });

  it('keeps the cart free of quantities — basket totals are out of scope', () => {
    expectTypeOf<CartItem>().not.toHaveProperty('quantity');
    expectTypeOf<Cart['items']>().toEqualTypeOf<CartItem[]>();
  });

  it('keeps Reason a discriminated union — a swap must say why', () => {
    expectTypeOf<Reason['kind']>().toEqualTypeOf<
      'additives' | 'nova' | 'protein' | 'sugars' | 'salt'
    >();
    expectTypeOf<Swap['reasons']>().toEqualTypeOf<Reason[]>();
  });

  it('types the nutrition lookup used by swap ranking', () => {
    expectTypeOf<NutritionIndex>().toEqualTypeOf<ReadonlyMap<number, NutritionFacts>>();
  });
});
