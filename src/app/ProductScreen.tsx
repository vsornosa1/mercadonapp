import { NutritionPanel } from '../components/NutritionPanel.tsx';
import { ProcessingBadge } from '../components/ProcessingBadge.tsx';
import { formatPrice } from '../lib/format.ts';
import { stripHtml } from '../lib/html.ts';
import type { EnrichedCatalogProduct } from '../types/catalog.ts';

interface ProductScreenProps {
  product: EnrichedCatalogProduct;
  onBack: () => void;
  onAdd: () => void;
  added: boolean;
}

export function ProductScreen({ product, onBack, onAdd, added }: ProductScreenProps) {
  const ingredients = product.ingredientsHtml ? stripHtml(product.ingredientsHtml) : null;

  return (
    <section aria-label={product.name}>
      <button type="button" className="back-button" onClick={onBack}>
        ← Volver
      </button>

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

      <ProcessingBadge signal={product.processing} />
      <NutritionPanel nutrition={product.nutrition} />

      {ingredients ? (
        <section className="panel" aria-labelledby="ingredients-title">
          <h2 id="ingredients-title" className="panel__title">
            Ingredientes
          </h2>
          <p className="ingredients__text">{ingredients}</p>
        </section>
      ) : null}
    </section>
  );
}
