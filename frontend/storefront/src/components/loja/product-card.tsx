import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import type { ProductListItem } from "@/lib/types";

/**
 * Porta de apps/storefront/src/components/loja/product-card.tsx.
 * Sem hover-only: no mobile não existe hover, então toda informação
 * essencial (preço, disponibilidade) está sempre visível.
 */
export function ProductCard({ product, priority = false }: { product: ProductListItem; priority?: boolean }) {
  const hasDiscount = product.salePriceInCents !== null;

  return (
    <article className="group">
      <Link to={`/produto/${product.slug}`} className="block rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-caramel">
        <div className="relative aspect-square overflow-hidden rounded-md bg-warm-white shadow-soft transition-shadow duration-300 group-hover:shadow-medium">
          {product.image ? (
            <img
              src={product.image.url}
              alt={product.image.alt}
              width={product.image.width ?? 400}
              height={product.image.height ?? 400}
              loading={priority ? "eager" : "lazy"}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-ink-muted">Sem imagem</div>
          )}

          {!product.isAvailable && (
            <div className="absolute inset-0 flex items-center justify-center bg-cream/70">
              <span className="rounded-full bg-ink/90 px-4 py-1.5 text-xs tracking-wide text-warm-white uppercase">Esgotado</span>
            </div>
          )}

          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {hasDiscount && product.isAvailable && <Badge tone="gold">Promoção</Badge>}
            {product.isLowStock && (
              <Badge tone="warning">{product.totalStock === 1 ? "Última unidade" : `Restam ${product.totalStock}`}</Badge>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <h3 className="font-serif text-lg leading-snug text-ink">{product.name}</h3>

          <p className="flex items-baseline gap-2">
            <span className="font-medium text-ink">{formatMoney(product.effectivePriceInCents)}</span>
            {hasDiscount && <span className="text-sm text-ink-muted line-through">{formatMoney(product.priceInCents)}</span>}
          </p>
        </div>
      </Link>
    </article>
  );
}
