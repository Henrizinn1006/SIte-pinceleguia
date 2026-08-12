import { z } from "zod";

/**
 * Contrato dos filtros do catálogo.
 *
 * O estado vive na query string para ser compartilhável, indexável e
 * recuperável pelo botão "voltar". Adicionar um filtro novo (por cor,
 * por coleção) é acrescentar um campo AQUI — não mexer em componente.
 * Ver docs/04-PAGINAS-E-API.md
 */

export const SORT_OPTIONS = [
  { value: "recentes", label: "Mais recentes" },
  { value: "menor-preco", label: "Menor preço" },
  { value: "maior-preco", label: "Maior preço" },
  { value: "destaque", label: "Em destaque" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export const AVAILABILITY_OPTIONS = [
  { value: "todos", label: "Todas as peças" },
  { value: "em-estoque", label: "Disponíveis" },
] as const;

export const PAGE_SIZE = 12;

/** Aceita string vazia e valores inválidos sem quebrar — cai no default. */
const optionalPositiveInt = z
  .string()
  .optional()
  .transform((v) => {
    if (!v) return undefined;
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  });

export const productFiltersSchema = z.object({
  categoria: z.string().trim().min(1).optional().catch(undefined),
  q: z.string().trim().min(1).max(80).optional().catch(undefined),
  precoMin: optionalPositiveInt,
  precoMax: optionalPositiveInt,
  disponibilidade: z.enum(["todos", "em-estoque"]).default("todos").catch("todos"),
  ordem: z
    .enum(["recentes", "menor-preco", "maior-preco", "destaque"])
    .default("recentes")
    .catch("recentes"),
  pagina: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? Number.parseInt(v, 10) : 1;
      return Number.isFinite(n) && n >= 1 ? n : 1;
    }),
});

export type ProductFilters = z.infer<typeof productFiltersSchema>;

/** Converte os searchParams do Next em filtros validados. */
export function parseProductFilters(
  searchParams: Record<string, string | string[] | undefined>,
): ProductFilters {
  const flat: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(searchParams)) {
    flat[key] = Array.isArray(value) ? value[0] : value;
  }
  return productFiltersSchema.parse(flat);
}

/** Monta a query string preservando os demais filtros. */
export function buildFilterHref(
  current: ProductFilters,
  changes: Partial<Record<keyof ProductFilters, string | number | undefined>>,
  basePath = "/loja",
): string {
  const params = new URLSearchParams();

  const merged: Record<string, string | number | undefined> = {
    categoria: current.categoria,
    q: current.q,
    precoMin: current.precoMin,
    precoMax: current.precoMax,
    disponibilidade:
      current.disponibilidade === "todos" ? undefined : current.disponibilidade,
    ordem: current.ordem === "recentes" ? undefined : current.ordem,
    pagina: current.pagina === 1 ? undefined : current.pagina,
    ...changes,
  };

  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === "" || value === null) continue;
    params.set(key, String(value));
  }

  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function hasActiveFilters(filters: ProductFilters): boolean {
  return Boolean(
    filters.categoria ||
      filters.q ||
      filters.precoMin !== undefined ||
      filters.precoMax !== undefined ||
      filters.disponibilidade !== "todos",
  );
}
