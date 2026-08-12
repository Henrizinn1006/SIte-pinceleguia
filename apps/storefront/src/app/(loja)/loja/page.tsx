import type { Metadata } from "next";
import { Container } from "@vortexis/ui";
import { CatalogFilters } from "@/components/loja/catalog-filters";
import { Pagination } from "@/components/loja/pagination";
import { EmptyState, ProductGrid } from "@/components/loja/product-grid";
import { SortSelect } from "@/components/loja/sort-select";
import {
  findAllCategories,
  findProducts,
  getPriceRange,
  parseProductFilters,
} from "@vortexis/commerce";

export const metadata: Metadata = {
  title: "Loja",
  description:
    "Todas as peças em porcelana autoral pintadas à mão — Orixás, Guias & Entidades e guias de proteção.",
  alternates: { canonical: "/loja" },
};

export default async function LojaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseProductFilters(await searchParams);

  const [result, categories, priceRange] = await Promise.all([
    findProducts(filters),
    findAllCategories(),
    getPriceRange(),
  ]);

  return (
    <Container className="py-12">
      <header className="mb-9">
        <h1 className="text-h1 font-serif">Loja</h1>
        <p className="mt-2 text-ink-muted">
          Porcelana autoral feita à mão, peça por peça.
        </p>
      </header>

      <div className="flex gap-10">
        <CatalogFilters
          filters={filters}
          categories={categories}
          priceRange={priceRange}
          totalResults={result.total}
        />

        <div className="min-w-0 flex-1">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-muted" aria-live="polite">
              {result.total === 0
                ? "Nenhuma peça encontrada"
                : `${result.total} ${result.total === 1 ? "peça" : "peças"}`}
            </p>
            <SortSelect filters={filters} />
          </div>

          {result.items.length > 0 ? (
            <>
              <ProductGrid products={result.items} columns={3} />
              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                hasNext={result.hasNext}
                hasPrevious={result.hasPrevious}
                filters={filters}
              />
            </>
          ) : (
            <EmptyState
              title="Nenhuma peça encontrada"
              description="Tente ajustar ou limpar os filtros aplicados."
            />
          )}
        </div>
      </div>
    </Container>
  );
}
