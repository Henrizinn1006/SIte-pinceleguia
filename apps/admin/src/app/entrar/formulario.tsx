"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { entrar, type EstadoLogin } from "./actions";

const ESTADO_INICIAL: EstadoLogin = {};

function BotaoEntrar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 w-full rounded-sm bg-caramel-deep font-medium text-warm-white transition-colors hover:bg-ink disabled:opacity-60"
    >
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export function FormularioDeLogin() {
  const [estado, acao] = useActionState(entrar, ESTADO_INICIAL);

  return (
    <form action={acao} className="space-y-4">
      {estado.erro && (
        <p
          role="alert"
          className="rounded-sm border border-danger/30 bg-danger/8 px-3 py-2 text-sm text-danger"
        >
          {estado.erro}
        </p>
      )}

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          autoFocus
          className="min-h-12 w-full rounded-sm border border-beige-dark bg-cream px-3 text-base"
        />
      </div>

      <div>
        <label htmlFor="senha" className="mb-1.5 block text-sm font-medium">
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          className="min-h-12 w-full rounded-sm border border-beige-dark bg-cream px-3 text-base"
        />
      </div>

      <BotaoEntrar />
    </form>
  );
}
