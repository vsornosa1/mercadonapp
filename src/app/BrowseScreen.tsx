import { useMemo, useState, type ReactNode } from 'react';

import {
  Breadcrumb,
  SectionGrid,
  SectionRail,
  ShelfList,
} from '../components/CategoryBrowser.tsx';
import { ProductResults } from '../components/ProductResults.tsx';
import { StateMessage } from '../components/StateMessage.tsx';
import { buildCategoryTree } from '../lib/category-tree.ts';
import { pluralise } from '../lib/plural.ts';
import type { EnrichedCatalogProduct } from '../types/catalog.ts';
import { useIsDesktop } from './useMediaQuery.ts';
import type { CatalogStatus } from './useCatalog.ts';

interface BrowseScreenProps {
  products: EnrichedCatalogProduct[];
  status: CatalogStatus;
  onSelectProduct: (id: number) => void;
}

/**
 * The sections view, arranged for the device it is running on.
 *
 * A phone drills: sections, then shelves, then products, one screen at a time,
 * with a breadcrumb to climb back out. A window can hold the section list and
 * the shelves at once, so it puts the sections in a rail and the content beside
 * them — and lands on a section rather than an empty pane.
 *
 * Both arrangements key products on the (section, shelf) pair, not the shelf
 * alone: a shelf is cross-listed in the source data, and the pair is what keeps
 * the count equal to the list it opens.
 */
export function BrowseScreen({ products, status, onSelectProduct }: BrowseScreenProps) {
  const isDesktop = useIsDesktop();
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [shelfId, setShelfId] = useState<number | null>(null);

  const tree = useMemo(() => buildCategoryTree(products), [products]);
  const section =
    tree.find((candidate) => candidate.id === sectionId) ?? (isDesktop ? (tree[0] ?? null) : null);
  const shelf = section?.shelves.find((candidate) => candidate.id === shelfId) ?? null;

  const shelfProducts = useMemo(
    () =>
      section === null || shelf === null
        ? []
        : products.filter(
            (p) => p.categoryPath[0]?.id === section.id && p.categoryPath[1]?.id === shelf.id,
          ),
    [products, section, shelf],
  );

  if (status === 'loading') {
    return (
      <Frame>
        <StateMessage title="Cargando el catálogo" hint="Estamos preparando las secciones." />
      </Frame>
    );
  }

  if (status === 'error') {
    return (
      <Frame>
        <StateMessage
          tone="alert"
          icon="alert"
          title="No se pudo cargar el catálogo"
          hint="Comprueba la conexión y vuelve a intentarlo."
        />
      </Frame>
    );
  }

  if (isDesktop) {
    return (
      <Frame>
        <div className="browse">
          <SectionRail
            sections={tree}
            selectedId={section?.id ?? null}
            onSelect={(id) => {
              setSectionId(id);
              setShelfId(null);
            }}
          />
          <div className="browse__pane">
            {section === null ? (
              <p className="muted">No hay categorías disponibles.</p>
            ) : shelf === null ? (
              <>
                <h2 className="browse__section-name">{section.name}</h2>
                <ShelfList section={section} onSelect={setShelfId} />
              </>
            ) : (
              <>
                <Breadcrumb
                  crumbs={[
                    { label: section.name, onClick: () => setShelfId(null) },
                    { label: shelf.name },
                  ]}
                />
                <ProductResults
                  key={`${section.id}-${shelf.id}`}
                  heading={`${pluralise(shelfProducts.length, 'producto', 'productos')} en ${shelf.name}`}
                  products={shelfProducts}
                  onSelectProduct={onSelectProduct}
                />
              </>
            )}
          </div>
        </div>
      </Frame>
    );
  }

  if (section === null) {
    return (
      <Frame>
        <SectionGrid sections={tree} onSelect={setSectionId} />
      </Frame>
    );
  }

  return (
    <Frame>
      <Breadcrumb
        crumbs={[
          {
            label: 'Categorías',
            onClick: () => {
              setSectionId(null);
              setShelfId(null);
            },
          },
          ...(shelf === null
            ? [{ label: section.name }]
            : [{ label: section.name, onClick: () => setShelfId(null) }, { label: shelf.name }]),
        ]}
      />

      {shelf === null ? (
        <ShelfList section={section} onSelect={setShelfId} />
      ) : (
        <ProductResults
          key={`${section.id}-${shelf.id}`}
          heading={`${pluralise(shelfProducts.length, 'producto', 'productos')} en ${shelf.name}`}
          products={shelfProducts}
          onSelectProduct={onSelectProduct}
        />
      )}
    </Frame>
  );
}

/** The one heading this view owns, present in every state it can be in. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <section aria-label="Categorías">
      <h1 className="screen-title">Categorías</h1>
      {children}
    </section>
  );
}
