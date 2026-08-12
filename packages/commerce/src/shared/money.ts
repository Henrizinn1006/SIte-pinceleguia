/**
 * Dinheiro no projeto é SEMPRE `number` inteiro em centavos.
 *
 * R$ 157,00 -> 15700
 *
 * Nunca usar float para valor monetário: 0.1 + 0.2 !== 0.3 em ponto
 * flutuante, e num carrinho isso vira centavo perdido em produção.
 */

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** 15700 -> "R$ 157,00" */
export function formatMoney(cents: number): string {
  return BRL.format(cents / 100);
}

/** 15700 -> "157,00" (sem símbolo) */
export function formatMoneyPlain(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** "157,00" | "R$ 157,00" | "157.00" -> 15700 */
export function parseMoneyToCents(input: string): number {
  const normalized = input
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}\b)/g, "")
    .replace(",", ".");
  const value = Number.parseFloat(normalized);
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

/** Percentual inteiro sobre um valor em centavos, arredondado para baixo. */
export function percentOf(cents: number, percent: number): number {
  return Math.floor((cents * percent) / 100);
}

/** Soma segura de valores em centavos. */
export function sumCents(values: readonly number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

/** Impede valores negativos onde eles não fazem sentido (total, frete). */
export function clampToZero(cents: number): number {
  return cents < 0 ? 0 : cents;
}
