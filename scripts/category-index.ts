export interface CategoryFile {
  id: number;
  name: string;
  categories?: unknown[];
}

/**
 * The mirror's categories.json has "results" as an array of SECTIONS
 * (e.g. "Aceite, especias y salsas", id 12). Each section carries a nested
 * "categories" array whose entries are the top-level categories with files.
 * Section ids have no files — returning them fails deep inside the download
 * loop; flattening the nested ids and deduplicating them is the correct read.
 */
export function topLevelCategoryIds(rootJson: unknown): number[] {
  const root = rootJson as { results?: { categories?: { id: number }[] }[] };
  if (!Array.isArray(root.results)) {
    throw new Error('categories.json: "results" must be an array of sections');
  }
  const ids = root.results.flatMap((section) =>
    Array.isArray(section.categories) ? section.categories.map((category) => category.id) : [],
  );
  return [...new Set(ids)];
}

export interface CategoryNode {
  id: number;
  name: string;
  categories?: CategoryNode[];
  products?: { id: number | string }[];
}

export interface CategoryPath {
  topLevelId: number;
  topLevelName: string;
  leafId: number;
  leafName: string;
}

/**
 * Walks the category tree and records, for every product found in a leaf's
 * products[] list, its leaf id/name and its top-level category id/name.
 * The leaf id is what scopes swaps (same-category alternatives).
 *
 * Product files do NOT carry their leaf category — only a single section entry
 * (e.g. { id: 12, level: 0 }). The tree is the source of the category lineage.
 */
export function buildCategoryIndex(
  topLevelFiles: readonly CategoryNode[],
): Map<number | string, CategoryPath> {
  const index = new Map<number | string, CategoryPath>();

  function walk(node: CategoryNode, topLevel: CategoryNode): void {
    if (Array.isArray(node.products)) {
      for (const product of node.products) {
        index.set(product.id, {
          topLevelId: topLevel.id,
          topLevelName: topLevel.name,
          leafId: node.id,
          leafName: node.name,
        });
      }
    }
    for (const child of node.categories ?? []) {
      walk(child, topLevel);
    }
  }

  for (const topLevel of topLevelFiles) {
    walk(topLevel, topLevel);
  }
  return index;
}
