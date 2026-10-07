import { formatNutrient } from '../lib/format.ts';
import type { NutritionFacts } from '../types/nutrition.ts';

interface Row {
  label: string;
  value: number | null;
  unit: 'kcal' | 'g';
}

export function NutritionPanel({ nutrition }: { nutrition: NutritionFacts }) {
  if (!nutrition.per100) {
    return (
      <section className="panel" aria-labelledby="nutrition-title">
        <h2 id="nutrition-title" className="panel__title">
          Información nutricional
        </h2>
        <p className="muted" role="status">
          Sin datos nutricionales.
        </p>
      </section>
    );
  }

  const rows: Row[] = [
    { label: 'Energía', value: nutrition.per100.kcal, unit: 'kcal' },
    { label: 'Proteínas', value: nutrition.per100.protein, unit: 'g' },
    { label: 'Hidratos de carbono', value: nutrition.per100.carbs, unit: 'g' },
    { label: 'Grasas', value: nutrition.per100.fat, unit: 'g' },
    { label: 'de las cuales saturadas', value: nutrition.per100.saturatedFat, unit: 'g' },
    { label: 'Azúcares', value: nutrition.per100.sugars, unit: 'g' },
    { label: 'Fibra', value: nutrition.per100.fiber, unit: 'g' },
    { label: 'Sal', value: nutrition.per100.salt, unit: 'g' },
  ];
  const present = rows.filter((row) => row.value != null);

  return (
    <section className="panel" aria-labelledby="nutrition-title">
      <h2 id="nutrition-title" className="panel__title">
        Información nutricional <span className="muted">(por 100 g)</span>
      </h2>
      <ul className="nutrition__list" role="list">
        {present.map((row) => (
          <li key={row.label} className="nutrition__row">
            <span className={row.label.startsWith('de las') ? 'nutrition__indent' : ''}>
              {row.label}
            </span>
            <span className="nutrition__value">{formatNutrient(row.value!, row.unit)}</span>
          </li>
        ))}
      </ul>
      {nutrition.source === 'off' ? (
        <p className="muted nutrition__source">Fuente: Open Food Facts</p>
      ) : null}
    </section>
  );
}
