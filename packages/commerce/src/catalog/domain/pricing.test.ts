import { describe, expect, it } from "vitest";
import { isSaleActive, resolvePrice, resolveVariantPrice } from "./pricing";

/**
 * Regras de preço são funções puras — testá-las não exige banco,
 * servidor nem mock. É por isso que elas vivem em `domain/`.
 * Ver docs/02-ARQUITETURA.md e docs/09-ROADMAP.md (FASE 6).
 */

const HOJE = new Date("2026-08-11T12:00:00Z");

const base = {
  basePriceInCents: 15700,
  salePriceInCents: null,
  saleStartsAt: null,
  saleEndsAt: null,
};

describe("isSaleActive", () => {
  it("não há promoção quando salePriceInCents é nulo", () => {
    expect(isSaleActive(base, HOJE)).toBe(false);
  });

  it("ignora promoção com preço maior ou igual ao cheio", () => {
    expect(isSaleActive({ ...base, salePriceInCents: 15700 }, HOJE)).toBe(false);
    expect(isSaleActive({ ...base, salePriceInCents: 19900 }, HOJE)).toBe(false);
  });

  it("aceita promoção sem janela de datas", () => {
    expect(isSaleActive({ ...base, salePriceInCents: 13900 }, HOJE)).toBe(true);
  });

  it("rejeita promoção que ainda não começou", () => {
    const input = {
      ...base,
      salePriceInCents: 13900,
      saleStartsAt: new Date("2026-09-01T00:00:00Z"),
    };
    expect(isSaleActive(input, HOJE)).toBe(false);
  });

  it("rejeita promoção já encerrada", () => {
    const input = {
      ...base,
      salePriceInCents: 13900,
      saleEndsAt: new Date("2026-08-01T00:00:00Z"),
    };
    expect(isSaleActive(input, HOJE)).toBe(false);
  });

  it("aceita promoção dentro da janela", () => {
    const input = {
      ...base,
      salePriceInCents: 13900,
      saleStartsAt: new Date("2026-08-01T00:00:00Z"),
      saleEndsAt: new Date("2026-08-31T23:59:59Z"),
    };
    expect(isSaleActive(input, HOJE)).toBe(true);
  });
});

describe("resolvePrice", () => {
  it("sem promoção, o preço efetivo é o preço cheio", () => {
    expect(resolvePrice(base, HOJE)).toEqual({
      priceInCents: 15700,
      salePriceInCents: null,
      effectivePriceInCents: 15700,
      discountPercent: 0,
    });
  });

  it("com promoção vigente, o preço efetivo é o promocional", () => {
    const result = resolvePrice({ ...base, salePriceInCents: 13900 }, HOJE);
    expect(result.effectivePriceInCents).toBe(13900);
    expect(result.priceInCents).toBe(15700);
    expect(result.discountPercent).toBe(11);
  });

  it("promoção expirada não altera o preço cobrado", () => {
    const result = resolvePrice(
      {
        ...base,
        salePriceInCents: 13900,
        saleEndsAt: new Date("2026-01-01T00:00:00Z"),
      },
      HOJE,
    );
    expect(result.effectivePriceInCents).toBe(15700);
    expect(result.salePriceInCents).toBeNull();
  });
});

describe("resolveVariantPrice", () => {
  it("o preço da variação sobrepõe o do produto", () => {
    const result = resolveVariantPrice(
      base,
      { priceInCents: 19900, salePriceInCents: null },
      HOJE,
    );
    expect(result.effectivePriceInCents).toBe(19900);
  });

  it("variação sem preço herda o do produto", () => {
    const result = resolveVariantPrice(
      base,
      { priceInCents: null, salePriceInCents: null },
      HOJE,
    );
    expect(result.effectivePriceInCents).toBe(15700);
  });

  it("promoção da variação vence a do produto", () => {
    const result = resolveVariantPrice(
      { ...base, salePriceInCents: 14900 },
      { priceInCents: 19900, salePriceInCents: 16900 },
      HOJE,
    );
    expect(result.priceInCents).toBe(19900);
    expect(result.effectivePriceInCents).toBe(16900);
  });
});
