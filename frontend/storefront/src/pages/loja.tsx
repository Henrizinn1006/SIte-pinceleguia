import { useSearchParams } from "react-router-dom";
import { Container } from "@/components/ui/container";
import { CatalogFilters } from "@/components/loja/catalog-filters";
import { Pagination } from "@/components/loja/pagination";
import { EmptyState, ProductGrid } from "@/components/loja/product-grid";
import { SortSelect } from "@/components/loja/sort-select";
import { findProducts } from "@/lib/api";
import { parseProductFilters } from "@/lib/filters";
import { useAsync } from "@/lib/use-async";
import { useDocumentHead } from "@/lib/head";

/** Porta de apps/storefront/src/app/(loja)/loja/page.tsx. */
export function LojaPage() {
  useDocumentHead("Loja | Pincel & Guia", "Todas as peças em porcelana autoral pintadas à mão — Orixás, Guias & Entidades e guias de proteção.");

  const [searchParams] = useSearchParams();
  const filters = parseProductFilters(searchParams);

  const { data, loading } = useAsync(() => findProducts(filters), [searchParams.toString()]);

  return (
    <Container className="py-12">
      <header className="mb-9">
        <h1 className="text-h1 font-serif">Loja</h1>
        <p className="mt-2 text-ink-muted">Porcelana autoral feita à mão, peça por peça.</p>
      </header>

      <div className="flex gap-10">
        <CatalogFilters
          filters={filters}
          categories={data?.meta.categories ?? []}
          priceRange={data?.meta.priceRange ?? { minInCents: 0, maxInCents: 0 }}
          totalResults={data?.data.total ?? 0}
        />

        <div className="min-w-0 flex-1">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-muted" aria-live="polite">
              {loading ? "Carregando…" : data?.data.total === 0 ? "Nenhuma peça encontrada" : `${data?.data.total} ${data?.data.total === 1 ? "peça" : "peças"}`}
            </p>
            <SortSelect filters={filters} />
          </div>

          {!loading && data && (
            data.data.items.length > 0 ? (
              <>
                <ProductGrid products={data.data.items} columns={3} />
                <Pagination page={data.data.page} totalPages={data.data.totalPages} hasNext={data.data.hasNext} hasPrevious={data.data.hasPrevious} filters={filters} />
              </>
            ) : (
              <EmptyState title="Nenhuma peça encontrada" description="Tente ajustar ou limpar os filtros aplicados." />
            )
          )}
        </div>
      </div>
    </Container>
  );
}
