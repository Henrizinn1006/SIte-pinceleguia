import { describe, expect, it } from "vitest";
import {
  buildFilterHref,
  hasActiveFilters,
  parseProductFilters,
} from "./product-filters";

describe("parseProductFilters", () => {
  it("aplica os padrões quando não há parâmetros", () => {
    const filters = parseProductFilters({});
    expect(filters.ordem).toBe("recentes");
    expect(filters.disponibilidade).toBe("todos");
    expect(filters.pagina).toBe(1);
    expect(filters.categoria).toBeUndefined();
  });

  it("não quebra com valores inválidos vindos da URL", () => {
    const filters = parseProductFilters({
      ordem: "sql-injection",
      disponibilidade: "qualquer-coisa",
      pagina: "-5",
      precoMin: "abc",
    });
    expect(filters.ordem).toBe("recentes");
    expect(filters.disponibilidade).toBe("todos");
    expect(filters.pagina).toBe(1);
    expect(filters.precoMin).toBeUndefined();
  });

  it("lê parâmetros válidos", () => {
    const filters = parseProductFilters({
      categoria: "categoria-exemplo",
      ordem: "menor-preco",
      pagina: "3",
      precoMin: "100",
      precoMax: "300",
    });
    expect(filters).toMatchObject({
      categoria: "categoria-exemplo",
      ordem: "menor-preco",
      pagina: 3,
      precoMin: 100,
      precoMax: 300,
    });
  });

  it("usa o primeiro valor quando o parâmetro vem repetido", () => {
    const filters = parseProductFilters({ categoria: ["categoria-exemplo", "outra"] });
    expect(filters.categoria).toBe("categoria-exemplo");
  });
});

describe("buildFilterHref", () => {
  it("preserva os filtros existentes ao alterar um deles", () => {
    const filters = parseProductFilters({ categoria: "categoria-exemplo", ordem: "menor-preco" });
    const href = buildFilterHref(filters, { pagina: 2 });
    expect(href).toContain("categoria=categoria-exemplo");
    expect(href).toContain("ordem=menor-preco");
    expect(href).toContain("pagina=2");
  });

  it("omite valores padrão para manter a URL limpa", () => {
    const filters = parseProductFilters({});
    expect(buildFilterHref(filters, {})).toBe("/loja");
  });

  it("remove um filtro quando o valor é undefined", () => {
    const filters = parseProductFilters({ categoria: "categoria-exemplo" });
    expect(buildFilterHref(filters, { categoria: undefined })).toBe("/loja");
  });

  it("respeita o basePath informado", () => {
    const filters = parseProductFilters({ ordem: "maior-preco" });
    expect(buildFilterHref(filters, {}, "/categoria/categoria-exemplo")).toBe(
      "/categoria/categoria-exemplo?ordem=maior-preco",
    );
  });
});

describe("hasActiveFilters", () => {
  it("é falso no estado inicial", () => {
    expect(hasActiveFilters(parseProductFilters({}))).toBe(false);
  });

  it("paginação sozinha não conta como filtro ativo", () => {
    expect(hasActiveFilters(parseProductFilters({ pagina: "4" }))).toBe(false);
  });

  it("é verdadeiro com categoria selecionada", () => {
    expect(hasActiveFilters(parseProductFilters({ categoria: "categoria-exemplo" }))).toBe(true);
  });
});
