import type { Metadata } from "next";
import { Container } from "@vortexis/ui";
import { Pagination } from "@/components/loja/pagination";
import { EmptyState, ProductGrid } from "@/components/loja/product-grid";
import { findProducts, parseProductFilters } from "@vortexis/commerce";

export const metadata: Metadata = {
  title: "Busca",
  // Página de resultado não deve ser indexada.
  robots: { index: false, follow: true },
};

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseProductFilters(await searchParams);
  const hasQuery = Boolean(filters.q);
  const result = hasQuery ? await findProducts(filters) : null;

  return (
    <Container className="py-12">
      <h1 className="text-h1 font-serif">Buscar peças</h1>

      <form action="/busca" method="get" className="mt-6 flex max-w-xl gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          O que você procura?
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={filters.q ?? ""}
          placeholder="Ex.: Iemanjá, guia de proteção…"
          className="min-h-11 flex-1 rounded-sm border border-beige-dark bg-warm-white px-4 text-base text-ink placeholder:text-ink-muted"
        />
        <button
          type="submit"
          className="min-h-11 rounded-sm bg-caramel-deep px-6 text-warm-white transition-colors hover:bg-ink"
        >
          Buscar
        </button>
      </form>

      <div className="mt-10">
        {!hasQuery && (
          <p className="text-ink-muted">Digite acima o que você está procurando.</p>
        )}

        {result && (
          <>
            <p className="mb-7 text-sm text-ink-muted" aria-live="polite">
              {result.total === 0
                ? `Nenhum resultado para “${filters.q}”`
                : `${result.total} ${result.total === 1 ? "resultado" : "resultados"} para “${filters.q}”`}
            </p>

            {result.items.length > 0 ? (
              <>
                <ProductGrid products={result.items} columns={4} />
                <Pagination
                  page={result.page}
                  totalPages={result.totalPages}
                  hasNext={result.hasNext}
                  hasPrevious={result.hasPrevious}
                  filters={filters}
                  basePath="/busca"
                />
              </>
            ) : (
              <EmptyState
                title="Nada encontrado"
                description="Tente outras palavras ou navegue pelas categorias."
              />
            )}
          </>
        )}
      </div>
    </Container>
  );
}
