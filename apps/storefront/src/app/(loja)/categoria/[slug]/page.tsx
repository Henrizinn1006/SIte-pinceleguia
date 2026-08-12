import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@vortexis/ui";
import { Pagination } from "@/components/loja/pagination";
import { EmptyState, ProductGrid } from "@/components/loja/product-grid";
import { SortSelect } from "@/components/loja/sort-select";
import {
  findAllCategorySlugs,
  findCategoryBySlug,
  findProducts,
  parseProductFilters,
} from "@vortexis/commerce";

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const slugs = await findAllCategorySlugs();
    return slugs.map(({ slug }) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await findCategoryBySlug(slug);

  if (!category) return { title: "Categoria não encontrada" };

  return {
    title: category.metaTitle ?? category.name,
    description: category.metaDescription ?? category.description ?? undefined,
    alternates: { canonical: `/categoria/${category.slug}` },
  };
}

export default async function CategoriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, rawSearchParams] = await Promise.all([params, searchParams]);

  const category = await findCategoryBySlug(slug);
  if (!category) notFound();

  // A categoria da URL sempre vence o parâmetro de query.
  const filters = { ...parseProductFilters(rawSearchParams), categoria: slug };
  const result = await findProducts(filters);
  const basePath = `/categoria/${slug}`;

  return (
    <Container className="py-12">
      <header className="mb-9 max-w-2xl">
        <h1 className="text-h1 font-serif">{category.name}</h1>
        {category.description && (
          <p className="mt-3 text-ink-muted">{category.description}</p>
        )}
      </header>

      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted" aria-live="polite">
          {result.total} {result.total === 1 ? "peça" : "peças"}
        </p>
        <SortSelect filters={filters} basePath={basePath} />
      </div>

      {result.items.length > 0 ? (
        <>
          <ProductGrid products={result.items} columns={4} />
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            hasNext={result.hasNext}
            hasPrevious={result.hasPrevious}
            filters={filters}
            basePath={basePath}
          />
        </>
      ) : (
        <EmptyState
          title="Ainda não há peças nesta categoria"
          description="Cadastre produtos nesta categoria pelo painel administrativo."
        />
      )}
    </Container>
  );
}
