import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Container } from "@/components/ui/container";
import { Pagination } from "@/components/loja/pagination";
import { EmptyState, ProductGrid } from "@/components/loja/product-grid";
import { findProducts } from "@/lib/api";
import { parseProductFilters } from "@/lib/filters";
import { useAsync } from "@/lib/use-async";
import { useDocumentHead } from "@/lib/head";

/** Porta de apps/storefront/src/app/(loja)/busca/page.tsx. Página de resultado não é indexada (ver robots.txt e SSR-lite). */
export function BuscaPage() {
  useDocumentHead("Busca | Pincel & Guia");

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const filters = parseProductFilters(searchParams);
  const hasQuery = Boolean(filters.q);
  const [inputValue, setInputValue] = useState(filters.q ?? "");

  const { data, loading } = useAsync(
    () => (hasQuery ? findProducts(filters) : Promise.resolve(null)),
    [searchParams.toString()],
  );

  return (
    <Container className="py-12">
      <h1 className="text-h1 font-serif">Buscar peças</h1>

      <form
        className="mt-6 flex max-w-xl gap-2"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          navigate(inputValue ? `/busca?q=${encodeURIComponent(inputValue)}` : "/busca");
        }}
      >
        <label htmlFor="q" className="sr-only">
          O que você procura?
        </label>
        <input
          id="q"
          name="q"
          type="search"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="Ex.: Iemanjá, guia de proteção…"
          className="min-h-11 flex-1 rounded-sm border border-beige-dark bg-warm-white px-4 text-base text-ink placeholder:text-ink-muted"
        />
        <button type="submit" className="min-h-11 rounded-sm bg-caramel-deep px-6 text-warm-white transition-colors hover:bg-ink">
          Buscar
        </button>
      </form>

      <div className="mt-10">
        {!hasQuery && <p className="text-ink-muted">Digite acima o que você está procurando.</p>}

        {hasQuery && !loading && data && (
          <>
            <p className="mb-7 text-sm text-ink-muted" aria-live="polite">
              {data.data.total === 0 ? `Nenhum resultado para “${filters.q}”` : `${data.data.total} ${data.data.total === 1 ? "resultado" : "resultados"} para “${filters.q}”`}
            </p>

            {data.data.items.length > 0 ? (
              <>
                <ProductGrid products={data.data.items} columns={4} />
                <Pagination page={data.data.page} totalPages={data.data.totalPages} hasNext={data.data.hasNext} hasPrevious={data.data.hasPrevious} filters={filters} basePath="/busca" />
              </>
            ) : (
              <EmptyState title="Nada encontrado" description="Tente outras palavras ou navegue pelas categorias." />
            )}
          </>
        )}
      </div>
    </Container>
  );
}
