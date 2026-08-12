/**
 * Autenticação por sessão e RBAC.
 *
 * Superfície de SERVIDOR. O catálogo de permissões, que é só
 * constantes, está em "@vortexis/auth/permissions" e pode ser
 * importado pelo navegador.
 */

export type { Actor } from "./actor";
export { criarActor } from "./actor";

export {
  PERMISSIONS,
  PAPEIS_DE_SISTEMA,
  TODAS_AS_PERMISSOES,
  type PermissionKey,
  type RoleKey,
} from "./permissions";

export {
  HASH_FALSO,
  gastarTempoDeVerificacao,
  hashPassword,
  verifyPassword,
} from "./password";

export { gerarToken, hashToken, tokensIguais } from "./tokens";

export {
  DURACAO_SESSAO_MS,
  NOME_COOKIE_SESSAO,
  autenticar,
  carregarActor,
  encerrarSessao,
  encerrarTodasAsSessoes,
  limparSessoesExpiradas,
  resolverSessao,
  type ResultadoLogin,
} from "./session";

export {
  registrar,
  registrarLoginFalho,
  registrarNegado,
  type Alteracoes,
  type RegistroDeAuditoria,
} from "./audit";

export { NaoAutenticadoError, SemPermissaoError } from "./errors";
