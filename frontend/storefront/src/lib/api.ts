import type {
  CartView,
  CategoryView,
  CheckoutPayload,
  CheckoutResult,
  ContentPage,
  OrderView,
  Paginated,
  ProductDetail,
  ProductListItem,
  PublicSettings,
} from "./types";
import type { ProductFilters } from "./filters";

/**
 * Cliente HTTP fino para a API PHP (backend/public/index.php).
 *
 * Substitui as chamadas diretas ao Prisma que existiam em
 * packages/commerce/src/catalog/infrastructure/*.repository.ts — aqui
 * tudo passa por fetch('/api/...'), nunca por SQL direto do navegador.
 */

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { headers: { Accept: "application/json" } });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const code = body?.error?.code ?? "UNKNOWN_ERROR";
    const message = body?.error?.message ?? "Não foi possível concluir a operação.";
    throw new ApiError(code, message, response.status);
  }

  return body.data as T;
}

async function mutateJson<T>(method: "POST" | "PUT" | "DELETE", path: string, payload?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const code = body?.error?.code ?? "UNKNOWN_ERROR";
    const message = body?.error?.message ?? "Não foi possível concluir a operação.";
    throw new ApiError(code, message, response.status);
  }

  return body.data as T;
}

export function findAllCategories(): Promise<CategoryView[]> {
  return getJson<CategoryView[]>("/api/categorias");
}

/** Categorias marcadas para aparecer na home. */
export function findHomeCategories(): Promise<CategoryView[]> {
  return getJson<CategoryView[]>("/api/categorias?home=1");
}

export async function findCategoryBySlug(slug: string): Promise<CategoryView | null> {
  try {
    return await getJson<CategoryView>(`/api/categorias/${encodeURIComponent(slug)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

interface ProductsResponse {
  data: Paginated<ProductListItem>;
  meta: { categories: CategoryView[]; priceRange: { minInCents: number; maxInCents: number } };
}

export async function findProducts(
  filters: ProductFilters,
): Promise<ProductsResponse> {
  const params = new URLSearchParams();
  if (filters.categoria) params.set("categoria", filters.categoria);
  if (filters.q) params.set("q", filters.q);
  if (filters.precoMin !== undefined) params.set("precoMin", String(filters.precoMin));
  if (filters.precoMax !== undefined) params.set("precoMax", String(filters.precoMax));
  if (filters.disponibilidade !== "todos") params.set("disponibilidade", filters.disponibilidade);
  if (filters.ordem !== "recentes") params.set("ordem", filters.ordem);
  if (filters.pagina !== 1) params.set("pagina", String(filters.pagina));

  const response = await fetch(`/api/produtos?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });
  const body = await response.json();
  if (!response.ok) {
    throw new ApiError(body?.error?.code ?? "UNKNOWN_ERROR", body?.error?.message ?? "Erro ao buscar produtos.", response.status);
  }
  return body as ProductsResponse;
}

export function findFeaturedProducts(limit = 6): Promise<ProductListItem[]> {
  return getJson<ProductListItem[]>(`/api/produtos/destaque?limite=${limit}`);
}

export async function findProductBySlug(slug: string): Promise<ProductDetail | null> {
  try {
    return await getJson<ProductDetail>(`/api/produtos/${encodeURIComponent(slug)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export function findRelatedProducts(slug: string): Promise<ProductListItem[]> {
  return getJson<ProductListItem[]>(`/api/produtos/${encodeURIComponent(slug)}/relacionados`);
}

export async function getContentPage(slug: string): Promise<ContentPage | null> {
  try {
    return await getJson<ContentPage>(`/api/conteudo/${encodeURIComponent(slug)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export function getPublicSettings(): Promise<PublicSettings> {
  return getJson<PublicSettings>("/api/configuracoes/publicas");
}

// --- Carrinho / checkout (Fase 3) --------------------------------------

export function getCart(): Promise<CartView> {
  return getJson<CartView>("/api/carrinho");
}

export function addCartItem(variantId: string, quantity = 1): Promise<CartView> {
  return mutateJson<CartView>("POST", "/api/carrinho/itens", { variantId, quantity });
}

export function updateCartItem(itemId: string, quantity: number): Promise<CartView> {
  return mutateJson<CartView>("PUT", `/api/carrinho/itens/${encodeURIComponent(itemId)}`, { quantity });
}

export function removeCartItem(itemId: string): Promise<CartView> {
  return mutateJson<CartView>("DELETE", `/api/carrinho/itens/${encodeURIComponent(itemId)}`);
}

export function checkout(payload: CheckoutPayload): Promise<CheckoutResult> {
  return mutateJson<CheckoutResult>("POST", "/api/checkout", payload);
}

export function trackOrder(token: string): Promise<OrderView> {
  return getJson<OrderView>(`/api/pedidos/${encodeURIComponent(token)}`);
}
