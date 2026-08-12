/**
 * Porta de packages/commerce/src/shared/money.ts.
 * Dinheiro é sempre `number` inteiro em centavos.
 */
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 15700 -> "R$ 157,00" */
export function formatMoney(cents: number): string {
  return BRL.format(cents / 100);
}
