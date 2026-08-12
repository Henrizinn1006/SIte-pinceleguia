/**
 * Cliente HTTP do painel. Duas diferenças em relação ao
 * frontend/storefront/src/lib/api.ts:
 *   - `credentials: "include"` em toda chamada, para o cookie de
 *     sessão (HttpOnly) ir junto;
 *   - toda mutação (POST/PUT/DELETE) manda o header `X-CSRF-Token`
 *     com o token obtido no login/`/api/admin/eu` — sem isso o
 *     backend rejeita com 403 (ver backend/src/Auth/AuthGuard.php).
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

let csrfToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const isMutation = method !== "GET";

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (isMutation && csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, { ...init, method, headers, credentials: "include" });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(body?.error?.code ?? "UNKNOWN_ERROR", body?.error?.message ?? "Não foi possível concluir a operação.", response.status);
  }

  return (body?.data ?? body) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) => request<T>(path, { method: "POST", body: data !== undefined ? JSON.stringify(data) : undefined }),
  postForm: <T>(path: string, data: FormData) => request<T>(path, { method: "POST", body: data }),
  put: <T>(path: string, data?: unknown) => request<T>(path, { method: "PUT", body: data !== undefined ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
