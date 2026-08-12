/**
 * Porta de packages/commerce/src/catalog/domain/product-filters.ts.
 *
 * O estado dos filtros continua vivendo na query string (compartilhável,
 * indexável, funciona com o botão "voltar") — só a fonte dos dados
 * (fetch em vez de Server Component) mudou.
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

export type AvailabilityOption = (typeof AVAILABILITY_OPTIONS)[number]["value"];

export const PAGE_SIZE = 12;

export interface ProductFilters {
  categoria?: string;
  q?: string;
  precoMin?: number;
  precoMax?: number;
  disponibilidade: AvailabilityOption;
  ordem: SortOption;
  pagina: number;
}

const SORT_VALUES = SORT_OPTIONS.map((o) => o.value) as string[];
const AVAILABILITY_VALUES = AVAILABILITY_OPTIONS.map((o) => o.value) as string[];

function optionalString(value: string | null, min: number, max: number): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) return undefined;
  return trimmed;
}

function optionalPositiveInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** Converte um URLSearchParams (React Router) em filtros validados. */
export function parseProductFilters(searchParams: URLSearchParams): ProductFilters {
  const ordemRaw = searchParams.get("ordem") ?? "recentes";
  const disponibilidadeRaw = searchParams.get("disponibilidade") ?? "todos";

  let pagina = 1;
  const paginaRaw = searchParams.get("pagina");
  if (paginaRaw) {
    const n = Number.parseInt(paginaRaw, 10);
    if (Number.isFinite(n) && n >= 1) pagina = n;
  }

  return {
    categoria: optionalString(searchParams.get("categoria"), 1, 255),
    q: optionalString(searchParams.get("q"), 1, 80),
    precoMin: optionalPositiveInt(searchParams.get("precoMin")),
    precoMax: optionalPositiveInt(searchParams.get("precoMax")),
    disponibilidade: (AVAILABILITY_VALUES.includes(disponibilidadeRaw) ? disponibilidadeRaw : "todos") as AvailabilityOption,
    ordem: (SORT_VALUES.includes(ordemRaw) ? ordemRaw : "recentes") as SortOption,
    pagina,
  };
}

/** Monta a query string preservando os demais filtros. */
export function buildFilterHref(
  current: ProductFilters,
  changes: Partial<Record<keyof ProductFilters, string | number | undefined>>,
  basePath = "/loja",
): string {
  const merged: Record<string, string | number | undefined> = {
    categoria: current.categoria,
    q: current.q,
    precoMin: current.precoMin,
    precoMax: current.precoMax,
    disponibilidade: current.disponibilidade === "todos" ? undefined : current.disponibilidade,
    ordem: current.ordem === "recentes" ? undefined : current.ordem,
    pagina: current.pagina === 1 ? undefined : current.pagina,
    ...changes,
  };

  const params = new URLSearchParams();
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
