import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sem conexão" };

/**
 * Servida pelo service worker quando uma navegação falha por falta de
 * rede. Deliberadamente honesta: não sugere que dá para trabalhar.
 */
export default function SemConexao() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="max-w-sm rounded-lg border border-beige-dark bg-warm-white px-6 py-8 text-center shadow-soft">
        <h1 className="font-serif text-xl">Sem conexão</h1>

        <p className="mt-3 text-sm text-ink-muted">
          O painel precisa de internet para salvar alterações com segurança.
          Estoque, pedidos e publicações dependem de confirmação do servidor.
        </p>

        <p className="mt-3 text-sm text-ink-muted">
          Rascunhos que você estava escrevendo continuam guardados neste
          aparelho.
        </p>

        <a
          href="/inicio"
          className="mt-6 inline-flex min-h-11 items-center rounded-sm bg-caramel-deep px-5 text-sm font-medium text-warm-white"
        >
          Tentar novamente
        </a>
      </div>
    </main>
  );
}
