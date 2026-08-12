import type { Metadata } from "next";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Início" };
export const dynamic = "force-dynamic";

/**
 * Dashboard — casca.
 *
 * As métricas reais entram na FASE 13, quando existirem pedidos e
 * estoque para medir. Métrica decorativa com número inventado é pior
 * que espaço vazio: cria confiança falsa.
 */
export default async function Inicio() {
  const actor = await requireSession();
  const primeiroNome = actor.name.split(" ")[0] ?? actor.name;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <header>
        <h1 className="font-serif text-2xl">Olá, {primeiroNome}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {actor.roleKeys.includes("admin")
            ? "Você tem acesso total ao painel."
            : "Seu acesso é de edição de catálogo e conteúdo."}
        </p>
      </header>

      <section className="mt-8 rounded-lg border border-beige-dark bg-warm-white p-5 shadow-soft">
        <h2 className="font-medium">Autenticação funcionando</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Sessão validada no servidor, permissões carregadas do banco e cada ação
          registrada em auditoria.
        </p>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-sm bg-cream px-3 py-2">
            <dt className="text-xs text-ink-muted">Papéis</dt>
            <dd className="mt-0.5">{actor.roleKeys.join(", ") || "—"}</dd>
          </div>
          <div className="rounded-sm bg-cream px-3 py-2">
            <dt className="text-xs text-ink-muted">Permissões</dt>
            <dd className="mt-0.5">{actor.permissions.size}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-lg border border-dashed border-beige-dark px-5 py-8 text-center">
        <p className="text-sm text-ink-muted">
          Os números de faturamento, pedidos e estoque aparecem aqui a partir da
          FASE 13 — quando houver dados reais para mostrar.
        </p>
        <p className="mt-3 text-xs text-ink-muted">
          Próximo passo: <strong className="text-ink">FASE 5</strong>, biblioteca de mídia.
        </p>
      </section>
    </div>
  );
}
