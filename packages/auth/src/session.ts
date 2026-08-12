import "server-only";
import { db } from "@vortexis/db";
import { criarActor, type Actor } from "./actor";
import {
  gastarTempoDeVerificacao,
  verifyPassword,
} from "./password";
import { gerarToken, hashToken } from "./tokens";

/**
 * Sessões do painel administrativo.
 *
 * Sessão em banco, não JWT: precisamos conseguir derrubar o acesso de
 * um administrador comprometido imediatamente, e revogar permissão sem
 * esperar um token expirar. Ver docs/13-AUTH-RBAC-SEGURANCA.md
 */

/** 8 horas, sem renovação automática. O painel fica aberto no celular. */
export const DURACAO_SESSAO_MS = 8 * 60 * 60 * 1000;

export const NOME_COOKIE_SESSAO = "pg_admin_session";

export interface ResultadoLogin {
  ok: boolean;
  /** Token puro — vai para o cookie, nunca para o banco. */
  token?: string;
  expiresAt?: Date;
  actor?: Actor;
  motivo?: "credenciais" | "sem_acesso" | "inativo";
}

/**
 * Autentica e cria sessão.
 *
 * A resposta é deliberadamente uniforme: e-mail inexistente, senha
 * errada e usuário sem acesso ao painel devolvem o mesmo `credenciais`
 * ao chamador que fala com o usuário final. A distinção interna serve
 * só para a auditoria.
 */
export async function autenticar(entrada: {
  email: string;
  senha: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<ResultadoLogin> {
  const email = entrada.email.trim().toLowerCase();

  const usuario = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      isActive: true,
      isStaff: true,
    },
  });

  // Sem usuário: gasta o mesmo tempo de uma verificação real para não
  // revelar quais e-mails existem.
  if (!usuario || !usuario.passwordHash) {
    await gastarTempoDeVerificacao();
    return { ok: false, motivo: "credenciais" };
  }

  const senhaCorreta = await verifyPassword(entrada.senha, usuario.passwordHash);
  if (!senhaCorreta) return { ok: false, motivo: "credenciais" };

  if (!usuario.isActive) return { ok: false, motivo: "inativo" };
  if (!usuario.isStaff) return { ok: false, motivo: "sem_acesso" };

  const token = gerarToken();
  const expiresAt = new Date(Date.now() + DURACAO_SESSAO_MS);

  await db.session.create({
    data: {
      userId: usuario.id,
      token: hashToken(token),
      expiresAt,
      ipAddress: entrada.ipAddress ?? null,
      userAgent: entrada.userAgent?.slice(0, 400) ?? null,
    },
  });

  await db.user.update({
    where: { id: usuario.id },
    data: { lastLoginAt: new Date() },
  });

  const actor = await carregarActor(usuario.id);

  return { ok: true, token, expiresAt, actor: actor ?? undefined };
}

/**
 * Resolve o token do cookie em um ator com permissões.
 * Retorna null para token inválido, expirado ou de usuário desativado.
 */
export async function resolverSessao(token: string | undefined): Promise<Actor | null> {
  if (!token) return null;

  const sessao = await db.session.findUnique({
    where: { token: hashToken(token) },
    select: { id: true, userId: true, expiresAt: true },
  });

  if (!sessao) return null;

  if (sessao.expiresAt.getTime() <= Date.now()) {
    // Limpeza oportunista: sessão expirada não precisa esperar o job.
    await db.session.delete({ where: { id: sessao.id } }).catch(() => {});
    return null;
  }

  return carregarActor(sessao.userId);
}

/**
 * Carrega usuário + papéis + permissões.
 *
 * Uma consulta só. As permissões são resolvidas por requisição, nunca
 * cacheadas por usuário — revogar acesso precisa valer no próximo
 * clique, não no próximo login.
 */
export async function carregarActor(userId: string): Promise<Actor | null> {
  const usuario = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      isStaff: true,
      roles: {
        select: {
          role: {
            select: {
              key: true,
              permissions: { select: { permission: { select: { key: true } } } },
            },
          },
        },
      },
    },
  });

  if (!usuario || !usuario.isActive || !usuario.isStaff) return null;

  const roleKeys: string[] = [];
  const permissions = new Set<string>();

  for (const vinculo of usuario.roles) {
    roleKeys.push(vinculo.role.key);
    for (const rp of vinculo.role.permissions) {
      permissions.add(rp.permission.key);
    }
  }

  return criarActor({
    id: usuario.id,
    name: usuario.name,
    email: usuario.email,
    roleKeys,
    permissions: [...permissions],
  });
}

/** Encerra a sessão atual. */
export async function encerrarSessao(token: string | undefined): Promise<void> {
  if (!token) return;
  await db.session.deleteMany({ where: { token: hashToken(token) } });
}

/** Encerra TODAS as sessões do usuário. Usado ao trocar senha. */
export async function encerrarTodasAsSessoes(userId: string): Promise<number> {
  const { count } = await db.session.deleteMany({ where: { userId } });
  return count;
}

/** Remove sessões expiradas. Chamado por job periódico. */
export async function limparSessoesExpiradas(): Promise<number> {
  const { count } = await db.session.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
  return count;
}
