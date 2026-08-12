import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ProductGallery } from "@/components/loja/product-gallery";
import { ProductGrid } from "@/components/loja/product-grid";
import { SectionHeading } from "@/components/loja/section-heading";
import { ApiError, findProductBySlug, findRelatedProducts, getPublicSettings } from "@/lib/api";
import { useCart } from "@/lib/cart-context";
import { formatMoney } from "@/lib/money";
import { useAsync } from "@/lib/use-async";
import { useDocumentHead } from "@/lib/head";
import { NotFoundPage } from "./not-found";

/**
 * Porta de apps/storefront/src/app/(loja)/produto/[slug]/page.tsx.
 *
 * O JSON-LD e o <title>/meta description "de verdade" (para robôs de
 * busca) são injetados pelo backend/public/index.php (SSR-lite) quando
 * a página é servida via PHP. Aqui, useDocumentHead só mantém o título
 * correto durante navegação client-side.
 */
export function ProdutoPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const product = useAsync(() => findProductBySlug(slug), [slug]);
  const related = useAsync(() => (product.data ? findRelatedProducts(slug) : Promise.resolve([])), [slug, product.data?.slug]);
  const settings = useAsync(getPublicSettings, []);
  const { addItem } = useCart();

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const firstAvailable = product.data?.variants.find((v) => v.isAvailable) ?? product.data?.variants[0] ?? null;
    setSelectedVariantId(firstAvailable?.id ?? null);
    setAdded(false);
  }, [product.data]);

  async function handleAddToCart() {
    if (!selectedVariantId) return;
    setAdding(true);
    setAddError(null);
    try {
      await addItem(selectedVariantId, 1);
      setAdded(true);
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : "Não foi possível adicionar ao carrinho.");
    } finally {
      setAdding(false);
    }
  }

  // metaTitle já vem com o sufixo " | Pincel & Guia" quando existe (ver
  // seed/backend) — só o fallback pelo nome puro precisa do sufixo.
  useDocumentHead(
    product.data ? (product.data.metaTitle ?? `${product.data.name} | Pincel & Guia`) : "Peça | Pincel & Guia",
    product.data?.metaDescription ?? product.data?.shortDescription ?? undefined,
  );

  if (!product.loading && product.data === null) {
    return <NotFoundPage />;
  }

  if (!product.data) return null;

  const p = product.data;
  const hasDiscount = p.salePriceInCents !== null;

  return (
    <Container className="py-10">
      <nav aria-label="Você está em" className="mb-8 text-sm text-ink-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link to="/" className="hover:text-ink">
              Início
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link to="/loja" className="hover:text-ink">
              Loja
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link to={`/categoria/${p.categorySlug}`} className="hover:text-ink">
              {p.categoryName}
            </Link>
          </li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        <ProductGallery images={p.images} productName={p.name} />

        <div>
          <p className="text-sm tracking-[0.12em] text-caramel-text uppercase">{p.categoryName}</p>

          <h1 className="mt-2 text-h1 font-serif">{p.name}</h1>

          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <p className="text-2xl font-medium text-ink">{formatMoney(p.effectivePriceInCents)}</p>
            {hasDiscount && (
              <>
                <p className="text-lg text-ink-muted line-through">{formatMoney(p.priceInCents)}</p>
                <Badge tone="gold">Promoção</Badge>
              </>
            )}
          </div>

          <div className="mt-4">
            {p.isAvailable ? (
              p.isLowStock ? (
                <Badge tone="warning">{p.totalStock === 1 ? "Última unidade disponível" : `Restam apenas ${p.totalStock} unidades`}</Badge>
              ) : (
                <Badge tone="success">Disponível</Badge>
              )
            ) : (
              <Badge tone="danger">Esgotado</Badge>
            )}
          </div>

          {p.hasRealVariants && (
            <fieldset className="mt-7">
              <legend className="mb-3 text-sm font-medium text-ink">Opção</legend>
              <ul className="flex flex-wrap gap-2">
                {p.variants.map((variant) => (
                  <li key={variant.id}>
                    <button
                      type="button"
                      disabled={!variant.isAvailable}
                      onClick={() => setSelectedVariantId(variant.id)}
                      aria-pressed={selectedVariantId === variant.id}
                      className="inline-flex min-h-11 items-center rounded-sm border px-4 text-sm text-ink transition-colors disabled:opacity-40 aria-pressed:border-caramel-deep aria-pressed:bg-beige/60"
                      style={{ borderColor: selectedVariantId === variant.id ? undefined : "var(--color-beige-dark)" }}
                    >
                      {variant.name}
                    </button>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}

          <div className="mt-8">
            <Button size="lg" className="w-full sm:w-auto" disabled={!p.isAvailable || !selectedVariantId || adding} onClick={handleAddToCart}>
              {adding ? "Adicionando…" : added ? "Adicionado ✓" : "Adicionar ao carrinho"}
            </Button>
            {addError && <p className="mt-2 text-xs text-danger">{addError}</p>}
            {added && !addError && (
              <p className="mt-2 text-xs text-ink-muted">
                Peça adicionada.{" "}
                <Link to="/carrinho" className="underline underline-offset-4 hover:text-ink">
                  Ver carrinho
                </Link>
                .
              </p>
            )}
          </div>

          <div className="mt-10 border-t border-beige pt-8">
            <h2 className="font-serif text-lg text-ink">Sobre a peça</h2>
            <p className="mt-3 leading-relaxed whitespace-pre-line text-ink-muted">{p.description}</p>
          </div>

          <div className="mt-8 rounded-md bg-beige/40 px-5 py-4 text-sm text-ink-muted">
            <p className="font-medium text-ink">Entrega</p>
            {settings.data ? (
              <p className="mt-1">
                {settings.data.shippingFlatRate.label}: {formatMoney(settings.data.shippingFlatRate.priceInCents)}
                {settings.data.shippingFlatRate.estimatedDays !== null && ` · prazo estimado de ${settings.data.shippingFlatRate.estimatedDays} dias úteis`}.{" "}
                <span className="italic">Valor provisório — confirmado no checkout.</span>
              </p>
            ) : (
              <p className="mt-1">Calculando…</p>
            )}
          </div>
        </div>
      </div>

      {related.data && related.data.length > 0 && (
        <section className="mt-24" aria-labelledby="relacionados">
          <div id="relacionados">
            <SectionHeading title="Você também pode gostar" />
          </div>
          <ProductGrid products={related.data} columns={4} />
        </section>
      )}
    </Container>
  );
}
