import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Pager } from './Pager.tsx';

describe('Pager', () => {
  it('renders nothing when there is only one page', () => {
    const { container } = render(<Pager page={1} pageCount={1} onPageChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('marks the current page for assistive technology', () => {
    render(<Pager page={2} pageCount={3} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Página 1' })).not.toHaveAttribute('aria-current');
  });

  it('reports its position as text, so pagination is not colour or position alone', () => {
    render(<Pager page={2} pageCount={3} onPageChange={vi.fn()} />);
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
  });

  it('moves to the requested page', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pager page={2} pageCount={3} onPageChange={onPageChange} />);
    await user.click(screen.getByRole('button', { name: 'Página 3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('disables previous on the first page and next on the last', () => {
    const { rerender } = render(<Pager page={1} pageCount={3} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeEnabled();

    rerender(<Pager page={3} pageCount={3} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
  });

  it('is exposed as a navigation landmark with a label', () => {
    render(<Pager page={1} pageCount={2} onPageChange={vi.fn()} />);
    expect(screen.getByRole('navigation', { name: 'Paginación' })).toBeInTheDocument();
  });
});
