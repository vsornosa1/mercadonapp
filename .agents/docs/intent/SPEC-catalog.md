# Spec: `catalog`

Module id: `catalog` · Depends on: nothing · Build order: 1st

## Objective

Get the Mercadona catalogue onto the phone without ever scraping Mercadona, and make it searchable by name in Spanish. This is the foundation: without a searchable catalogue there is nothing to enrich, put in a cart, or suggest alternatives for.

**Critical constraint:** Mercadona's API has **no REST search endpoint** — search upstream is Algolia-backed. So the catalogue must exist locally. That is the whole reason this module exists.

## Inputs

The Hugging Face dataset `datania/mercadona-catalog` (MIT):

| File | Contents |
|---|---|
| `product_ids.json` | The index of all product ids (~4,332) |
| `products/<id>.json` | One product, in raw Mercadona API shape |
| `categories.json`, `categories/<id>.json` | Category tree |

## Output contract

The app consumes an emitted bundle. Domain type:

```ts
interface CatalogProduct {
  id: number;                    // Mercadona product id
  ean: string | null;            // the join key for nutrition; null must be tolerated
  slug: string;
  name: string;                  // display_name, verbatim Spanish
  brand: string;
  categoryPath: { id: number; name: string }[];  // 3 levels, root → leaf
  leafCategoryId: number;        // deepest level; scopes swaps
  thumbnail: string;             // imgix thumbnail, for lists
  photo: string;                 // imgix regular, for the product view
  unitPrice: number;
  bulkPrice: number | null;
  unitSize: string;              // e.g. "1 l"
  packaging: string | null;
  ingredientsHtml: string | null;
  allergensHtml: string | null;
  isVariableWeight: boolean;
  shareUrl: string;
}
```

Emitted to `public/catalog/`: the product records plus a prebuilt search index. The app reads them from cache; it never fetches them from Mercadona.

## Search behaviour

- Index over `name`, `brand`, and category names.
- **Accent- and case-insensitive**: input is NFKD-normalised and stripped of diacritics on both sides, so `platano` matches `Plátano` and `atun` matches `Atún`. This is a stated requirement, not a nicety — nobody types accents with one thumb in an aisle.
- Fuzzy matching (`Fuse.js`) with a tuned threshold; exact prefix matches rank above fuzzy ones.
- Empty query shows categories, not an empty list.

## Acceptance criteria

1. `npm run data:fetch` populates `data/raw/` and makes **zero** requests to `tienda.mercadona.es`.
2. The emitted bundle's product count is reported, and any difference from `product_ids.json` is explained in the script output rather than silently dropped.
3. Products with `ean: null` are kept and flagged, never filtered out.
4. Searching `platano` returns `Plátano de Canarias`; `atun` returns `Atún`. Verified by test.
5. Accent-insensitive matching is covered by unit tests including `ñ`, accented vowels, and `ü`.
6. Emitted bundle ≤ 1.5 MB gzipped, measured by the build script, which fails if exceeded.
7. DevTools Network shows **zero** requests to `tienda.mercadona.es` for a full session.
8. `npm run build` succeeds with the network disabled.

## Boundaries

**Always** — normalise on both query and index side (normalising one side only is the classic accent bug); keep `ingredientsHtml` verbatim, never pre-strip the HTML upstream of the parser.

**Ask first** — switching catalogue source; adding a search dependency; committing `data/raw/` to git.

**Never** — fall back to live-scraping Mercadona when the mirror is stale or a product is missing; invent a product ordering the mirror doesn't have.

## Open questions

1. **Bundle size vs. freshness** — ship the full 4,300 products, or a slim index plus lazy detail chunks? Decide against the measured gzip size, not a guess.
2. **`data/enriched/` is committed but `data/raw/` is not** — confirm that split matches intent (the enrichment is the slow, polite step worth caching in git; the raw mirror is cheap to re-download).
3. **Warehouse/locale pinning** — the mirror's product count varies run-to-run (~4,319 vs ~4,332), likely warehouse-dependent. Does that matter for a single-user app? Assumed no.
