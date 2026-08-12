import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError, setCsrfToken } from "./api";
import type { AdminUser } from "./types";

interface AuthState {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Resolve a sessão atual uma vez ao montar (via GET /api/admin/eu, que
 * usa o cookie HttpOnly já enviado pelo navegador) e guarda o token
 * CSRF em memória — nunca em localStorage, para não sobreviver a um
 * XSS que consiga ler storage.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ user: AdminUser; csrfToken: string }>("/api/admin/eu")
      .then((data) => {
        setUser(data.user);
        setCsrfToken(data.csrfToken);
      })
      .catch(() => {
        setUser(null);
        setCsrfToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ user: AdminUser; csrfToken: string }>("/api/admin/entrar", { email, password });
    setUser(data.user);
    setCsrfToken(data.csrfToken);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/admin/sair");
    } finally {
      setUser(null);
      setCsrfToken(null);
    }
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
