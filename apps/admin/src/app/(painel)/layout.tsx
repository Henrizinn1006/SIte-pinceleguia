import { Gaveta } from "@/components/gaveta";
import { Icone } from "@/components/icones";
import {
  NavegacaoInferior,
  NavegacaoLateral,
} from "@/components/navegacao-lateral";
import { NAVEGACAO, filtrarPorPermissao } from "@/lib/navegacao";
import { requireSession } from "@/lib/session";
import { sair } from "../entrar/actions";

/** Nada do painel é pré-renderizado — ver docs/15-PWA-CACHE.md §3 */
export const dynamic = "force-dynamic";

export default async function LayoutDoPainel({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await requireSession();
  const itens = filtrarPorPermissao(NAVEGACAO, (p) => actor.can(p));

  const botaoSair = (
    <form action={sair}>
      <button
        type="submit"
        className="flex min-h-11 w-full items-center gap-3 rounded-sm px-3 text-sm text-ink-muted transition-colors hover:bg-beige/40 hover:text-ink"
      >
        <Icone nome="logout" className="size-5" />
        Sair
      </button>
    </form>
  );

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar — desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-beige-dark bg-warm-white lg:flex">
        <div className="flex items-center gap-2.5 border-b border-beige px-4 py-4">
          <span
            aria-hidden
            className="flex size-9 items-center justify-center rounded-full border border-caramel/60"
          >
            <span className="font-serif text-xs text-gold">P&amp;G</span>
          </span>
          <span className="font-serif text-sm leading-tight">
            Pincel &amp; Guia
            <span className="block text-xs text-ink-muted">Admin</span>
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <NavegacaoLateral itens={itens} />
        </div>

        <div className="border-t border-beige p-3">
          <p className="px-3 pb-2 text-xs text-ink-muted">
            {actor.name}
            <span className="block truncate opacity-70">{actor.email}</span>
          </p>
          {botaoSair}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Cabeçalho — celular */}
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-beige-dark bg-warm-white px-3 py-2 lg:hidden">
          <Gaveta itens={itens}>{botaoSair}</Gaveta>
          <span className="font-serif text-base">Pincel &amp; Guia Admin</span>
        </header>

        {/* pb-20 abre espaço para a barra inferior no celular */}
        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
      </div>

      <NavegacaoInferior itens={itens} />
    </div>
  );
}
