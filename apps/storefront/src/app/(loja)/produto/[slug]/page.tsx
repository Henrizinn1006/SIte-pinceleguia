import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@vortexis/ui";
import { ProductGallery } from "@/components/loja/product-gallery";
import { ProductGrid } from "@/components/loja/product-grid";
import { SectionHeading } from "@/components/loja/section-heading";
import { formatMoney } from "@vortexis/commerce/client";
import { dynamicHref } from "@/lib/routes";
import { site } from "@/lib/site";
import {
  findAllProductSlugs,
  findProductBySlug,
  findRelatedProducts,
} from "@vortexis/commerce";

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const slugs = await findAllProductSlugs();
    return slugs.map(({ slug }) => ({ slug }));
  } catch {
    // Build sem banco disponível: as páginas são geradas sob demanda.
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await findProductBySlug(slug);

  if (!product) return { title: "Peça não encontrada" };

  const description =
    product.metaDescription ?? product.shortDescription ?? product.description.slice(0, 155);

  return {
    title: product.metaTitle ?? product.name,
    description,
    alternates: { canonical: `/produto/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.name,
      description,
      url: `${site.url}/produto/${product.slug}`,
      images: product.image ? [{ url: product.image.url, alt: product.image.alt }] : [],
    },
  };
}

export default async function ProdutoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await findProductBySlug(slug);

  if (!product) notFound();

  const related = await findRelatedProducts(product.id, product.categorySlug);
  const hasDiscount = product.salePriceInCents !== null;

  // Dados estruturados de produto — melhora a apresentação no Google.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription ?? product.description,
    image: product.images.map((image) => `${site.url}${image.url}`),
    category: product.categoryName,
    offers: {
      "@type": "Offer",
      url: `${site.url}/produto/${product.slug}`,
      priceCurrency: "BRL",
      price: (product.effectivePriceInCents / 100).toFixed(2),
      availability: product.isAvailable
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Conteúdo gerado por nós a partir do banco, não de entrada do usuário.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Container className="py-10">
        <nav aria-label="Você está em" className="mb-8 text-sm text-ink-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-ink">
                Início
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href="/loja" className="hover:text-ink">
                Loja
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link
                href={dynamicHref(`/categoria/${product.categorySlug}`)}
                className="hover:text-ink"
              >
                {product.categoryName}
              </Link>
            </li>
          </ol>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <ProductGallery images={product.images} productName={product.name} />

          <div>
            <p className="text-sm tracking-[0.12em] text-caramel-text uppercase">
              {product.categoryName}
            </p>

            <h1 className="mt-2 text-h1 font-serif">{product.name}</h1>

            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              <p className="text-2xl font-medium text-ink">
                {formatMoney(product.effectivePriceInCents)}
              </p>
              {hasDiscount && (
                <>
                  <p className="text-lg text-ink-muted line-through">
                    {formatMoney(product.priceInCents)}
                  </p>
                  <Badge tone="gold">Promoção</Badge>
                </>
              )}
            </div>

            <div className="mt-4">
              {product.isAvailable ? (
                product.isLowStock ? (
                  <Badge tone="warning">
                    {product.totalStock === 1
                      ? "Última unidade disponível"
                      : `Restam apenas ${product.totalStock} unidades`}
                  </Badge>
                ) : (
                  <Badge tone="success">Disponível</Badge>
                )
              ) : (
                <Badge tone="danger">Esgotado</Badge>
              )}
            </div>

            {product.hasRealVariants && (
              <fieldset className="mt-7">
                <legend className="mb-3 text-sm font-medium text-ink">Opção</legend>
                <ul className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <li key={variant.id}>
                      <span
                        className="inline-flex min-h-11 items-center rounded-sm border border-beige-dark px-4 text-sm text-ink data-[unavailable=true]:opacity-40"
                        data-unavailable={!variant.isAvailable}
                      >
                        {variant.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </fieldset>
            )}

            {/* O carrinho real chega na FASE 3. Até lá o botão está
                desabilitado — melhor que um botão que não faz nada. */}
            <div className="mt-8">
              <Button size="lg" className="w-full sm:w-auto" disabled>
                Adicionar ao carrinho
              </Button>
              <p className="mt-2 text-xs text-ink-muted">
                Carrinho e checkout entram na próxima etapa do desenvolvimento.
              </p>
            </div>

            <div className="mt-10 border-t border-beige pt-8">
              <h2 className="font-serif text-lg text-ink">Sobre a peça</h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-ink-muted">
                {product.description}
              </p>
            </div>

            <div className="mt-8 rounded-md bg-beige/40 px-5 py-4 text-sm text-ink-muted">
              <p className="font-medium text-ink">Entrega</p>
              <p className="mt-1">
                Prazos e valores de envio serão exibidos aqui.{" "}
                <span className="italic">
                  Informação pendente de definição com o cliente.
                </span>
              </p>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-24" aria-labelledby="relacionados">
            <div id="relacionados">
              <SectionHeading title="Você também pode gostar" />
            </div>
            <ProductGrid products={related} columns={4} />
          </section>
        )}
      </Container>
    </>
  );
}
