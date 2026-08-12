import { useEffect, useState } from "react";

/**
 * Busca de dados client-side mínima — substitui o `await` direto nos
 * Server Components do Next.js original. Sem lib externa (React Query
 * etc.) de propósito: a Fase 1 só precisa de GETs simples de catálogo.
 */
export function useAsync<T>(fetcher: () => Promise<T>, deps: React.DependencyList): {
  data: T | null;
  loading: boolean;
  error: Error | null;
} {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: Error | null }>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));

    fetcher()
      .then((data) => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((error: Error) => {
        if (active) setState({ data: null, loading: false, error });
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
