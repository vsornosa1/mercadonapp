import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RecommendationBanner } from './RecommendationBanner.tsx';

describe('RecommendationBanner', () => {
  it('says which product this one is an alternative to', () => {
    render(
      <RecommendationBanner
        fromName="Yogur azucarado YogoMix"
        reasons={[{ kind: 'sugars', from: 18, to: 3.6 }]}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByText(/Recomendado en lugar de/)).toHaveTextContent('Yogur azucarado YogoMix');
  });

  it('shows every benefit with its numbers, so the reason is visible on arrival', () => {
    render(
      <RecommendationBanner
        fromName="Yogur azucarado"
        reasons={[
          { kind: 'protein', from: 4.8, to: 10 },
          { kind: 'sugars', from: 18, to: 3.6 },
        ]}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByText('Más proteína')).toBeInTheDocument();
    expect(screen.getByText('4,8 g → 10 g por 100 g')).toBeInTheDocument();
    expect(screen.getByText('Menos azúcar')).toBeInTheDocument();
    expect(screen.getByText('18 g → 3,6 g')).toBeInTheDocument();
  });

  it('offers a way back to the product it was recommended against', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(
      <RecommendationBanner
        fromName="Yogur azucarado"
        reasons={[{ kind: 'sugars', from: 18, to: 3.6 }]}
        onBack={onBack}
      />,
    );
    const back = screen.getByRole('button', { name: /Volver a Yogur azucarado/ });
    await user.click(back);
    expect(onBack).toHaveBeenCalled();
  });

  it('is announced as a status region so the feedback is not silent for screen readers', () => {
    render(
      <RecommendationBanner
        fromName="Yogur"
        reasons={[{ kind: 'sugars', from: 18, to: 3.6 }]}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
