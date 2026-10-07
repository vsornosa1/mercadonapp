import type { CatalogProduct } from '../types/catalog.ts';

export interface CategoryShelf {
  id: number;
  name: string;
  count: number;
}

export interface CategorySection {
  id: number;
  name: string;
  count: number;
  shelves: CategoryShelf[];
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'es');

/**
 * Builds the browse tree: 26 sections, each holding its shelves. This is what
 * replaces a single wall of 148 category chips — the user picks a section,
 * then a shelf, and only then sees products.
 */
export function buildCategoryTree(products: readonly CatalogProduct[]): CategorySection[] {
  const sections = new Map<
    number,
    { id: number; name: string; count: number; shelves: Map<number, CategoryShelf> }
  >();

  for (const product of products) {
    const section = product.categoryPath[0];
    const shelf = product.categoryPath[1];
    if (!section || !shelf) continue;

    let entry = sections.get(section.id);
    if (!entry) {
      entry = { id: section.id, name: section.name, count: 0, shelves: new Map() };
      sections.set(section.id, entry);
    }
    entry.count += 1;

    const existing = entry.shelves.get(shelf.id);
    if (existing) existing.count += 1;
    else entry.shelves.set(shelf.id, { id: shelf.id, name: shelf.name, count: 1 });
  }

  return [...sections.values()]
    .map((section) => ({
      id: section.id,
      name: section.name,
      count: section.count,
      shelves: [...section.shelves.values()].sort(byName),
    }))
    .sort(byName);
}
