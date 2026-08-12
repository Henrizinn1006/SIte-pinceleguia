import { Shell } from "@/components/shell";
import { useAuth } from "@/lib/auth-context";

/**
 * Dashboard deliberadamente sem métrica inventada — mesma decisão do
 * apps/admin original (docs internos: "um número decorativo é pior
 * que espaço vazio"). Pedidos/faturamento entram quando o carrinho e
 * os pedidos existirem (Fase 3+).
 */
export function HomePage() {
  const { user } = useAuth();

  return (
    <Shell>
      <h1 className="text-2xl font-serif text-ink">Início</h1>
      <p className="mt-2 max-w-prose text-ink-muted">
        Olá, {user?.name}. Use o menu à esquerda para gerenciar categorias, produtos e as configurações públicas da loja.
      </p>
      <p className="mt-6 max-w-prose text-sm text-ink-muted">
        Métricas de vendas e pedidos aparecem aqui quando o carrinho e o checkout existirem — por enquanto, mostrar um
        número aqui seria inventado.
      </p>
    </Shell>
  );
}
