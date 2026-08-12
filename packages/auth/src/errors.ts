/**
 * Erros de autenticação e autorização.
 *
 * Separados dos erros de domínio de commerce porque `@vortexis/auth`
 * não deve depender de `@vortexis/commerce` — a dependência seria na
 * direção errada.
 */

export class NaoAutenticadoError extends Error {
  readonly code = "UNAUTHENTICATED";
  readonly httpStatus = 401;
  constructor(mensagem = "Sessão ausente ou expirada") {
    super(mensagem);
    this.name = "NaoAutenticadoError";
  }
}

export class SemPermissaoError extends Error {
  readonly code = "FORBIDDEN";
  readonly httpStatus = 403;
  constructor(readonly permissao: string) {
    super(`Permissão necessária: ${permissao}`);
    this.name = "SemPermissaoError";
  }
}
