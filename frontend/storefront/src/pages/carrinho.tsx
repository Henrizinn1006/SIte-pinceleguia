import { Link } from "react-router-dom";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { formatMoney } from "@/lib/money";
import { useDocumentHead } from "@/lib/head";

/** Carrinho — Fase 3. Preço sempre vem resolvido pelo servidor (ver App\Cart\CartRepository). */
export function CarrinhoPage() {
  useDocumentHead("Carrinho | Pincel & Guia");
  const { cart, loading, updateItem, removeItem } = useCart();

  if (loading) {
    return (
      <Container className="py-12">
        <p className="text-ink-muted">Carregando…</p>
      </Container>
    );
  }

  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <Container className="py-16 text-center">
        <h1 className="text-h1 font-serif">Seu carrinho está vazio</h1>
        <p className="mx-auto mt-3 max-w-prose text-ink-muted">Que tal dar uma olhada nas peças da loja?</p>
        <ButtonLink to="/loja" className="mt-6">
          Ver a loja
        </ButtonLink>
      </Container>
    );
  }

  return (
    <Container className="py-12">
      <h1 className="text-h1 font-serif">Carrinho</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
        <ul className="flex flex-col gap-6">
          {items.map((item) => (
            <li key={item.itemId} className="flex gap-4 border-b border-beige pb-6">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.imageAlt ?? ""} width={96} height={96} className="size-24 shrink-0 rounded-sm bg-warm-white object-cover" />
              ) : (
                <div className="flex size-24 shrink-0 items-center justify-center rounded-sm bg-warm-white text-xs text-ink-muted">Sem imagem</div>
              )}

              <div className="flex flex-1 flex-col gap-1">
                <Link to={`/produto/${item.productSlug}`} className="font-serif text-lg text-ink hover:underline">
                  {item.productName}
                </Link>
                {item.variantName !== "Padrão" && <p className="text-sm text-ink-muted">{item.variantName}</p>}
                {!item.isAvailable && <p className="text-sm text-danger">Estoque insuficiente para a quantidade escolhida.</p>}

                <div className="mt-2 flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-ink">
                    Qtd.
                    <input
                      type="number"
                      min={1}
                      max={item.stock}
                      defaultValue={item.quantity}
                      onBlur={(e) => {
                        const value = Number.parseInt(e.target.value, 10);
                        if (Number.isFinite(value) && value >= 1 && value !== item.quantity) void updateItem(item.itemId, value);
                      }}
                      className="min-h-9 w-16 rounded-sm border border-beige-dark bg-transparent px-2"
                    />
                  </label>
                  <button type="button" onClick={() => void removeItem(item.itemId)} className="text-sm text-danger underline underline-offset-2">
                    Remover
                  </button>
                </div>
              </div>

              <p className="whitespace-nowrap font-medium text-ink">{formatMoney(item.lineTotalInCents)}</p>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-md bg-beige/40 p-6">
          <h2 className="font-serif text-lg text-ink">Resumo</h2>
          <div className="mt-4 flex justify-between text-sm text-ink-muted">
            <span>Subtotal</span>
            <span>{formatMoney(cart?.subtotalInCents ?? 0)}</span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">Frete calculado no checkout.</p>

          <ButtonLink to="/checkout" size="lg" className="mt-6 w-full justify-center">
            Continuar para o checkout
          </ButtonLink>
        </aside>
      </div>
    </Container>
  );
}
