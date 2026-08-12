/**
 * Regras de preço — funções PURAS, sem I/O.
 *
 * Isolar isso aqui é o que permite testar todos os casos de promoção
 * em milissegundos, sem banco. Ver docs/09-ROADMAP.md (FASE 6).
 */

export interface PriceInput {
  basePriceInCents: number;
  salePriceInCents: number | null;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
}

export interface ResolvedPrice {
  /** Preço cheio, sempre. */
  priceInCents: number;
  /** Preço promocional se estiver vigente AGORA, senão null. */
  salePriceInCents: number | null;
  /** O que o cliente paga. */
  effectivePriceInCents: number;
  /** Desconto em pontos percentuais inteiros (0 se não houver). */
  discountPercent: number;
}

/**
 * Uma promoção só vale se:
 *  - existe salePriceInCents
 *  - é menor que o preço cheio
 *  - a data de hoje está dentro da janela (quando a janela existe)
 */
export function isSaleActive(input: PriceInput, now: Date = new Date()): boolean {
  const { salePriceInCents, basePriceInCents, saleStartsAt, saleEndsAt } = input;

  if (salePriceInCents === null) return false;
  if (salePriceInCents >= basePriceInCents) return false;
  if (saleStartsAt && now < saleStartsAt) return false;
  if (saleEndsAt && now > saleEndsAt) return false;

  return true;
}

export function resolvePrice(input: PriceInput, now: Date = new Date()): ResolvedPrice {
  const active = isSaleActive(input, now);
  const sale = active ? input.salePriceInCents : null;
  const effective = sale ?? input.basePriceInCents;

  const discountPercent =
    sale !== null && input.basePriceInCents > 0
      ? Math.round(((input.basePriceInCents - sale) / input.basePriceInCents) * 100)
      : 0;

  return {
    priceInCents: input.basePriceInCents,
    salePriceInCents: sale,
    effectivePriceInCents: effective,
    discountPercent,
  };
}

/**
 * O preço da variação sobrepõe o do produto quando informado.
 * Uma variação com priceInCents null herda o preço do produto.
 */
export function resolveVariantPrice(
  product: PriceInput,
  variant: { priceInCents: number | null; salePriceInCents: number | null },
  now: Date = new Date(),
): ResolvedPrice {
  return resolvePrice(
    {
      basePriceInCents: variant.priceInCents ?? product.basePriceInCents,
      salePriceInCents: variant.salePriceInCents ?? product.salePriceInCents,
      saleStartsAt: product.saleStartsAt,
      saleEndsAt: product.saleEndsAt,
    },
    now,
  );
}
