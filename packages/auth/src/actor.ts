import type { PermissionKey } from "./permissions";

/**
 * Quem está executando a ação.
 *
 * Construído uma vez por requisição a partir da sessão. As permissões
 * já vêm resolvidas — carregar do banco a cada checagem seria caro, e
 * cachear por usuário faria revogação demorar até o próximo login.
 */
export interface Actor {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly roleKeys: readonly string[];
  readonly permissions: ReadonlySet<string>;

  can(permission: PermissionKey): boolean;
  canAll(...permissions: PermissionKey[]): boolean;
  canAny(...permissions: PermissionKey[]): boolean;
}

export function criarActor(dados: {
  id: string;
  name: string;
  email: string;
  roleKeys: string[];
  permissions: string[];
}): Actor {
  const permissions = new Set(dados.permissions);

  return {
    id: dados.id,
    name: dados.name,
    email: dados.email,
    roleKeys: dados.roleKeys,
    permissions,
    can: (permission) => permissions.has(permission),
    canAll: (...lista) => lista.every((p) => permissions.has(p)),
    canAny: (...lista) => lista.some((p) => permissions.has(p)),
  };
}
