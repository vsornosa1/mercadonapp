import { useMemo } from 'react';

import { NutritionPanel } from '../components/NutritionPanel.tsx';
import { ProcessingBadge } from '../components/ProcessingBadge.tsx';
import { ProductThumb } from '../components/ProductThumb.tsx';
import { RecommendationBanner } from '../components/RecommendationBanner.tsx';
import { SimilarList } from '../components/SimilarList.tsx';
import { SwapList } from '../components/SwapList.tsx';
import { evaluateAlternatives, isFoodProduct } from '../lib/alternatives.ts';
import { formatPrice } from '../lib/format.ts';
import { stripHtml } from '../lib/html.ts';
import { findSimilar } from '../lib/similar.ts';
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
  onSelectSimilar: (id: number) => void;
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
  onSelectSimilar,
}: ProductScreenProps) {
  const ingredients = product.ingredientsHtml ? stripHtml(product.ingredientsHtml) : null;
  const isFood = isFoodProduct(product.categoryPath);
  const alternatives = useMemo(
    () => evaluateAlternatives(product, catalog, signals, 3),
    [product, catalog, signals],
  );

  // Recommendations are ordered, never merged: better alternatives answer "can I
  // do better?", similares answer "what else is here?". A product offered as a
  // better alternative is not repeated below it.
  const betterIds = useMemo(
    () =>
      new Set(
        alternatives.kind === 'available'
          ? alternatives.swaps.map((swap) => swap.product.id)
          : [],
      ),
    [alternatives],
  );
  const similar = useMemo(
    () => findSimilar(product, catalog, betterIds),
    [product, catalog, betterIds],
  );

  return (
    <article className="product-page" aria-label={product.name}>
      <div className="product-page__layout">
        <div className="product-page__media">
          <button type="button" className="back-button" onClick={onBack}>
            ← Volver
          </button>

          {/* The large photo the catalogue already provides, previously unused. */}
          <ProductThumb
            className="product-page__hero"
            src={product.photo}
            alt={product.name}
            loading="eager"
          />

          <h1 className="product-page__name">{product.name}</h1>
          {product.brand ? <p className="product-page__brand">{product.brand}</p> : null}
          <p className="product-page__price">
            {formatPrice(product.unitPrice)}
            {product.unitSize ? (
              <span className="product-page__unit"> · {product.unitSize}</span>
            ) : null}
          </p>

          <div className="product-page__action">
            <button type="button" className="add-button" onClick={onAdd} disabled={added}>
              {added ? 'En la lista ✓' : 'Añadir a la lista'}
            </button>
          </div>
        </div>

        <div className="product-page__body">
          {recommendation ? (
            <RecommendationBanner
              fromName={recommendation.fromName}
              reasons={recommendation.reasons}
              onBack={recommendation.onBackToOrigin}
            />
          ) : null}

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
          <SimilarList products={similar} onSelect={onSelectSimilar} />
        </div>
      </div>
    </article>
  );
}
