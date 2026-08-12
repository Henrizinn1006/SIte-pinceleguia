import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/session";
import { FormularioDeLogin } from "./formulario";

export const metadata: Metadata = { title: "Entrar" };

/** Sessão é sempre verificada no servidor, nunca no cliente. */
export const dynamic = "force-dynamic";

export default async function PaginaDeLogin() {
  const actor = await getActor();
  if (actor) redirect("/inicio");

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span
            aria-hidden
            className="mx-auto flex size-14 items-center justify-center rounded-full border border-caramel/60 bg-warm-white"
          >
            <span className="font-serif text-lg text-gold">P&amp;G</span>
          </span>
          <h1 className="mt-4 font-serif text-2xl">Pincel &amp; Guia</h1>
          <p className="mt-1 text-sm text-ink-muted">Painel administrativo</p>
        </div>

        <div className="rounded-lg border border-beige-dark bg-warm-white p-6 shadow-soft">
          <FormularioDeLogin />
        </div>

        <p className="mt-6 text-center text-xs text-ink-muted">
          O acesso é por convite. Fale com o administrador se precisar de uma conta.
        </p>
      </div>
    </main>
  );
}
