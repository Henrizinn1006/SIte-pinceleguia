import { useParams, useSearchParams } from "react-router-dom";
import { Container } from "@/components/ui/container";
import { Pagination } from "@/components/loja/pagination";
import { EmptyState, ProductGrid } from "@/components/loja/product-grid";
import { SortSelect } from "@/components/loja/sort-select";
import { findCategoryBySlug, findProducts } from "@/lib/api";
import { parseProductFilters } from "@/lib/filters";
import { useAsync } from "@/lib/use-async";
import { useDocumentHead } from "@/lib/head";
import { NotFoundPage } from "./not-found";

/** Porta de apps/storefront/src/app/(loja)/categoria/[slug]/page.tsx. */
export function CategoriaPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();

  const category = useAsync(() => findCategoryBySlug(slug), [slug]);

  const filters = { ...parseProductFilters(searchParams), categoria: slug };
  const basePath = `/categoria/${slug}`;
  const products = useAsync(
    () => (category.data ? findProducts(filters) : Promise.resolve(null)),
    [slug, searchParams.toString(), category.data?.slug],
  );

  // metaTitle já vem com o sufixo " | Pincel & Guia" quando existe (ver
  // seed/backend) — só o fallback pelo nome puro precisa do sufixo.
  useDocumentHead(
    category.data ? (category.data.metaTitle ?? `${category.data.name} | Pincel & Guia`) : "Categoria | Pincel & Guia",
    category.data?.metaDescription ?? category.data?.description ?? undefined,
  );

  if (!category.loading && category.data === null) {
    return <NotFoundPage />;
  }

  if (!category.data) return null;

  const result = products.data?.data;

  return (
    <Container className="py-12">
      <header className="mb-9 max-w-2xl">
        <h1 className="text-h1 font-serif">{category.data.name}</h1>
        {category.data.description && <p className="mt-3 text-ink-muted">{category.data.description}</p>}
      </header>

      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted" aria-live="polite">
          {result ? `${result.total} ${result.total === 1 ? "peça" : "peças"}` : "Carregando…"}
        </p>
        <SortSelect filters={filters} basePath={basePath} />
      </div>

      {result && (
        result.items.length > 0 ? (
          <>
            <ProductGrid products={result.items} columns={4} />
            <Pagination page={result.page} totalPages={result.totalPages} hasNext={result.hasNext} hasPrevious={result.hasPrevious} filters={filters} basePath={basePath} />
          </>
        ) : (
          <EmptyState title="Ainda não há peças nesta categoria" description="Cadastre produtos nesta categoria pelo painel administrativo." />
        )
      )}
    </Container>
  );
}
