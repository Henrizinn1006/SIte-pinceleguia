import { Container } from "@vortexis/ui";
import { CategoryCard } from "@/components/loja/category-card";
import { Hero } from "@/components/loja/hero";
import { EmptyState, ProductGrid } from "@/components/loja/product-grid";
import { SectionHeading } from "@/components/loja/section-heading";
import { findFeaturedProducts, findHomeCategories } from "@vortexis/commerce";
import { getFeaturedTitle, getHero } from "@/modules/content";

/** ISR: a home é regenerada no máximo a cada 60s. */
export const revalidate = 60;

export default async function HomePage() {
  // Consultas em paralelo — evita cascata de round-trips ao banco.
  const [hero, featuredTitle, categories, featured] = await Promise.all([
    getHero(),
    getFeaturedTitle(),
    findHomeCategories(),
    findFeaturedProducts(6),
  ]);

  return (
    <>
      <Hero content={hero} />

      {categories.length > 0 && (
        <Container as="section" className="mt-4" aria-label="Categorias">
          <ul className="grid gap-4 md:grid-cols-3">
            {categories.map((category) => (
              <li key={category.id}>
                <CategoryCard category={category} />
              </li>
            ))}
          </ul>
        </Container>
      )}

      <Container as="section" className="mt-20" aria-labelledby="destaques">
        <div id="destaques">
          <SectionHeading
            title={featuredTitle.title}
            linkLabel={featuredTitle.linkLabel}
            linkHref="/loja"
          />
        </div>

        {featured.length > 0 ? (
          <ProductGrid products={featured} columns={6} />
        ) : (
          <EmptyState
            title="Nenhuma peça em destaque no momento"
            description="Marque produtos como destaque no painel administrativo para exibi-los aqui."
          />
        )}
      </Container>

      <Container as="section" className="mt-24" size="narrow">
        <div className="rounded-lg bg-beige/45 px-8 py-14 text-center">
          <div className="ornament mx-auto mb-5 max-w-[10rem]" aria-hidden>
            <span className="text-sm">✦</span>
          </div>
          <h2 className="text-h2 font-serif">Cada peça é única</h2>
          <p className="mx-auto mt-4 max-w-prose text-ink-muted">
            Todas as peças são pintadas à mão, uma a uma. Pequenas variações de
            traço e tonalidade fazem parte da natureza do trabalho artesanal — não
            existem duas iguais.
          </p>
        </div>
      </Container>
    </>
  );
}
