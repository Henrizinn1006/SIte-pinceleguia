import "server-only";
import { db } from "@vortexis/db";
import type { Actor } from "./actor";

/**
 * Trilha de auditoria.
 *
 * Registrar NUNCA pode derrubar a operação: se o log falhar, a ação já
 * aconteceu. Erros aqui vão para o console e seguem — perder um
 * registro é ruim; perder a venda por causa dele é pior.
 *
 * Ver docs/13-AUTH-RBAC-SEGURANCA.md §6
 */

/**
 * Campos que NUNCA entram no log, mesmo se vierem no objeto de
 * alterações. Allowlist seria mais seguro, mas exigiria manutenção em
 * cada entidade; esta lista cobre o que é sensível de fato.
 */
const CAMPOS_PROIBIDOS = new Set([
  "password",
  "passwordHash",
  "senha",
  "token",
  "tokenHash",
  "secret",
  "accessToken",
  "refreshToken",
  "apiKey",
  "cardNumber",
  "cvv",
  "document",
  "cpf",
]);

export type Alteracoes = Record<string, { de: unknown; para: unknown }>;

function limpar(changes: Alteracoes | undefined): Alteracoes | undefined {
  if (!changes) return undefined;
  const saida: Alteracoes = {};
  for (const [campo, valor] of Object.entries(changes)) {
    if (CAMPOS_PROIBIDOS.has(campo)) {
      saida[campo] = { de: "[oculto]", para: "[oculto]" };
      continue;
    }
    saida[campo] = valor;
  }
  return saida;
}

export interface RegistroDeAuditoria {
  action: string;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  changes?: Alteracoes;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function registrar(
  actor: Pick<Actor, "id" | "email">,
  registro: RegistroDeAuditoria,
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: actor.id,
        userEmail: actor.email,
        action: registro.action,
        entityType: registro.entityType,
        entityId: registro.entityId ?? null,
        entityLabel: registro.entityLabel ?? null,
        changes: limpar(registro.changes) ?? undefined,
        denied: false,
        ipAddress: registro.ipAddress ?? null,
        userAgent: registro.userAgent?.slice(0, 400) ?? null,
      },
    });
  } catch (erro) {
    console.error("[auditoria] falha ao registrar", registro.action, erro);
  }
}

/**
 * Tentativa barrada por falta de permissão.
 *
 * Registrar isto é tão importante quanto registrar o sucesso: é o
 * primeiro sinal de credencial comprometida ou de papel mal atribuído.
 */
export async function registrarNegado(
  actor: Pick<Actor, "id" | "email">,
  permissao: string,
  contexto?: { ipAddress?: string | null; userAgent?: string | null },
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: actor.id,
        userEmail: actor.email,
        action: `denied.${permissao}`,
        entityType: "permission",
        entityId: permissao,
        denied: true,
        ipAddress: contexto?.ipAddress ?? null,
        userAgent: contexto?.userAgent?.slice(0, 400) ?? null,
      },
    });
  } catch (erro) {
    console.error("[auditoria] falha ao registrar negativa", permissao, erro);
  }
}

/** Evento de autenticação sem ator resolvido (login falhou). */
export async function registrarLoginFalho(
  email: string,
  motivo: string,
  contexto?: { ipAddress?: string | null; userAgent?: string | null },
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userEmail: email.slice(0, 200),
        action: "auth.login.failed",
        entityType: "session",
        entityLabel: motivo,
        denied: true,
        ipAddress: contexto?.ipAddress ?? null,
        userAgent: contexto?.userAgent?.slice(0, 400) ?? null,
      },
    });
  } catch (erro) {
    console.error("[auditoria] falha ao registrar login malsucedido", erro);
  }
}
