import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { CategorySection } from '../lib/category-tree.ts';
import { SectionGrid, ShelfList } from './CategoryBrowser.tsx';

const sections: CategorySection[] = [
  { id: 12, name: 'Aceite, especias y salsas', count: 139, shelves: [] },
  { id: 18, name: 'Agua y refrescos', count: 190, shelves: [] },
];

describe('SectionGrid', () => {
  it('shows one card per section, not every shelf — this is what replaces the wall of chips', () => {
    render(<SectionGrid sections={sections} onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Aceite, especias y salsas/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Agua y refrescos/ })).toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(2);
  });

  it('shows how many products each section holds', () => {
    render(<SectionGrid sections={sections} onSelect={vi.fn()} />);
    expect(screen.getByText('139 productos')).toBeInTheDocument();
    expect(screen.getByText('190 productos')).toBeInTheDocument();
  });

  it('reports the selected section', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<SectionGrid sections={sections} onSelect={onSelect} />);
    await user.click(screen.getByRole('button', { name: /Agua y refrescos/ }));
    expect(onSelect).toHaveBeenCalledWith(18);
  });

  it('shows an empty state rather than a blank area', () => {
    render(<SectionGrid sections={[]} onSelect={vi.fn()} />);
    expect(screen.getByText(/No hay categorías/i)).toBeInTheDocument();
  });
});

describe('ShelfList', () => {
  const section: CategorySection = {
    id: 12,
    name: 'Aceite, especias y salsas',
    count: 3,
    shelves: [
      { id: 112, name: 'Aceite, vinagre y sal', count: 2 },
      { id: 115, name: 'Especias', count: 1 },
    ],
  };

  it('lists the shelves inside the chosen section', () => {
    render(<ShelfList section={section} onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Aceite, vinagre y sal/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Especias/ })).toBeInTheDocument();
  });

  it('reports the selected shelf', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ShelfList section={section} onSelect={onSelect} />);
    await user.click(screen.getByRole('button', { name: /Especias/ }));
    expect(onSelect).toHaveBeenCalledWith(115);
  });
});
