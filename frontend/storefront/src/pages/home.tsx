import { Container } from "@/components/ui/container";
import { CategoryCard } from "@/components/loja/category-card";
import { Hero } from "@/components/loja/hero";
import { EmptyState, ProductGrid } from "@/components/loja/product-grid";
import { SectionHeading } from "@/components/loja/section-heading";
import { findFeaturedProducts, findHomeCategories, getPublicSettings } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { useDocumentHead } from "@/lib/head";
import type { FeaturedTitle, HeroContent } from "@/lib/types";

const HERO_FALLBACK: HeroContent = {
  title: "Pincel & Guia",
  subtitle: "Porcelana autoral feita à mão",
  tagline: "Arte, fé e ancestralidade em cada peça",
  ctaLabel: "Conheça a coleção",
  ctaHref: "/loja",
  imageUrl: "/demo/hero.svg",
  imageAlt: "Composição com peças de porcelana pintadas à mão",
};

const FEATURED_TITLE_FALLBACK: FeaturedTitle = { title: "Peças em destaque", linkLabel: "Ver todas" };

/** Porta de apps/storefront/src/app/(loja)/page.tsx. */
export function HomePage() {
  useDocumentHead("Pincel & Guia — Porcelana autoral feita à mão", "Porcelana autoral pintada à mão. Peças dedicadas aos Orixás, Guias e Entidades.");

  const settings = useAsync(getPublicSettings, []);
  const categories = useAsync(findHomeCategories, []);
  const featured = useAsync(() => findFeaturedProducts(6), []);

  const hero = settings.data?.homeHero ?? HERO_FALLBACK;
  const featuredTitle = settings.data?.homeFeaturedTitle ?? FEATURED_TITLE_FALLBACK;

  return (
    <>
      <Hero content={hero} />

      {categories.data && categories.data.length > 0 && (
        <Container as="section" className="mt-4" aria-label="Categorias">
          <ul className="grid gap-4 md:grid-cols-3">
            {categories.data.map((category) => (
              <li key={category.id}>
                <CategoryCard category={category} />
              </li>
            ))}
          </ul>
        </Container>
      )}

      <Container as="section" className="mt-20" aria-labelledby="destaques">
        <div id="destaques">
          <SectionHeading title={featuredTitle.title} linkLabel={featuredTitle.linkLabel} linkHref="/loja" />
        </div>

        {featured.loading ? null : featured.data && featured.data.length > 0 ? (
          <ProductGrid products={featured.data} columns={6} />
        ) : (
          <EmptyState title="Nenhuma peça em destaque no momento" description="Marque produtos como destaque no painel administrativo para exibi-los aqui." />
        )}
      </Container>

      <Container as="section" className="mt-24" size="narrow">
        <div className="rounded-lg bg-beige/45 px-8 py-14 text-center">
          <div className="ornament mx-auto mb-5 max-w-[10rem]" aria-hidden>
            <span className="text-sm">✦</span>
          </div>
          <h2 className="text-h2 font-serif">Cada peça é única</h2>
          <p className="mx-auto mt-4 max-w-prose text-ink-muted">
            Todas as peças são pintadas à mão, uma a uma. Pequenas variações de traço e tonalidade fazem parte da natureza do
            trabalho artesanal — não existem duas iguais.
          </p>
        </div>
      </Container>
    </>
  );
}
