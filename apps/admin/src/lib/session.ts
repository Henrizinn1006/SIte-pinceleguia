import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  DURACAO_SESSAO_MS,
  NOME_COOKIE_SESSAO,
  NaoAutenticadoError,
  SemPermissaoError,
  registrarNegado,
  resolverSessao,
  type Actor,
  type PermissionKey,
} from "@vortexis/auth";

/**
 * Cola entre o Next e o pacote de autenticação.
 *
 * O pacote não conhece cookies nem `next/*` de propósito — assim ele
 * serve outro framework sem alteração. Esta camada é o que traduz.
 */

export async function lerTokenDaSessao(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(NOME_COOKIE_SESSAO)?.value;
}

export async function gravarCookieDeSessao(token: string, expiraEm: Date) {
  const jar = await cookies();
  jar.set(NOME_COOKIE_SESSAO, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiraEm,
    maxAge: Math.floor(DURACAO_SESSAO_MS / 1000),
  });
}

export async function apagarCookieDeSessao() {
  const jar = await cookies();
  jar.delete(NOME_COOKIE_SESSAO);
}

/** Contexto da requisição para a auditoria. */
export async function contextoDaRequisicao() {
  const h = await headers();
  return {
    ipAddress:
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null,
    userAgent: h.get("user-agent"),
  };
}

/** Ator atual, ou null. Use quando a ausência de sessão é aceitável. */
export async function getActor(): Promise<Actor | null> {
  return resolverSessao(await lerTokenDaSessao());
}

/**
 * Exige sessão. Em páginas, redireciona para o login.
 *
 * ⚠️ Isto é conveniência de navegação. A defesa real é
 * `requirePermission` dentro de cada Server Action.
 */
export async function requireSession(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/entrar");
  return actor;
}

/**
 * A DEFESA REAL. Toda Server Action administrativa começa por aqui.
 *
 * Botão escondido no frontend não é autorização — qualquer pessoa
 * capaz de abrir o DevTools chama a action direto.
 * Ver docs/13-AUTH-RBAC-SEGURANCA.md §2.2
 */
export async function requirePermission(permissao: PermissionKey): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new NaoAutenticadoError();

  if (!actor.can(permissao)) {
    // Tentativa negada é o primeiro sinal de credencial comprometida.
    await registrarNegado(actor, permissao, await contextoDaRequisicao());
    throw new SemPermissaoError(permissao);
  }

  return actor;
}
