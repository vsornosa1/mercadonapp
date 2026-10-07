import { useMemo } from 'react';

import { NutritionPanel } from '../components/NutritionPanel.tsx';
import { ProcessingBadge } from '../components/ProcessingBadge.tsx';
import { RecommendationBanner } from '../components/RecommendationBanner.tsx';
import { SwapList } from '../components/SwapList.tsx';
import { evaluateAlternatives, isFoodProduct } from '../lib/alternatives.ts';
import { formatPrice } from '../lib/format.ts';
import { stripHtml } from '../lib/html.ts';
import type { SwapSignals } from '../lib/swaps.ts';
import type { EnrichedCatalogProduct } from '../types/catalog.ts';
import type { Reason, Swap } from '../types/swaps.ts';

export interface RecommendationContext {
  fromName: string;
  reasons: Reason[];
  onBackToOrigin: () => void;
}

interface ProductScreenProps {
  product: EnrichedCatalogProduct;
  catalog: EnrichedCatalogProduct[];
  signals: Map<number, SwapSignals>;
  recommendation?: RecommendationContext;
  onBack: () => void;
  onAdd: () => void;
  added: boolean;
  onSelectSwap: (swap: Swap) => void;
}

export function ProductScreen({
  product,
  catalog,
  signals,
  recommendation,
  onBack,
  onAdd,
  added,
  onSelectSwap,
}: ProductScreenProps) {
  const ingredients = product.ingredientsHtml ? stripHtml(product.ingredientsHtml) : null;
  const isFood = isFoodProduct(product.categoryPath);
  const alternatives = useMemo(
    () => evaluateAlternatives(product, catalog, signals, 3),
    [product, catalog, signals],
  );

  return (
    <section aria-label={product.name}>
      <button type="button" className="back-button" onClick={onBack}>
        ← Volver
      </button>

      {recommendation ? (
        <RecommendationBanner
          fromName={recommendation.fromName}
          reasons={recommendation.reasons}
          onBack={recommendation.onBackToOrigin}
        />
      ) : null}

      <div className="product-detail">
        <img className="product-detail__photo" src={product.photo} alt={product.name} />
        <div className="product-detail__header">
          <h2 className="product-detail__name">{product.name}</h2>
          {product.brand ? <p className="product-detail__brand">{product.brand}</p> : null}
          <p className="product-detail__price">
            {formatPrice(product.unitPrice)}
            {product.unitSize ? <span className="muted"> · {product.unitSize}</span> : null}
          </p>
          <button type="button" className="add-button" onClick={onAdd} disabled={added}>
            {added ? 'En la lista ✓' : 'Añadir a la lista'}
          </button>
        </div>
      </div>

      {isFood ? <ProcessingBadge signal={product.processing} /> : null}
      {isFood ? <NutritionPanel nutrition={product.nutrition} /> : null}

      {ingredients ? (
        <section className="panel" aria-labelledby="ingredients-title">
          <h2 id="ingredients-title" className="panel__title">
            Ingredientes
          </h2>
          <p className="ingredients__text">{ingredients}</p>
        </section>
      ) : null}

      <SwapList result={alternatives} onSelect={onSelectSwap} />
    </section>
  );
}
