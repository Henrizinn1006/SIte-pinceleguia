/**
 * Erros de domínio tipados.
 *
 * A camada de apresentação traduz `code` para uma mensagem em português.
 * O usuário nunca vê stack trace; o log guarda o detalhe técnico.
 * Ver docs/02-ARQUITETURA.md
 */

export abstract class DomainError extends Error {
  abstract readonly code: string;
  /** Status HTTP sugerido quando o erro cruza uma fronteira HTTP. */
  readonly httpStatus: number = 400;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  readonly code = "NOT_FOUND";
  override readonly httpStatus = 404;
}

export class UnauthorizedError extends DomainError {
  readonly code = "UNAUTHORIZED";
  override readonly httpStatus = 401;
}

export class ForbiddenError extends DomainError {
  readonly code = "FORBIDDEN";
  override readonly httpStatus = 403;
}

export class ValidationError extends DomainError {
  readonly code = "VALIDATION_ERROR";
  override readonly httpStatus = 422;
}

export class InsufficientStockError extends DomainError {
  readonly code = "INSUFFICIENT_STOCK";
  override readonly httpStatus = 409;

  constructor(
    readonly variantId: string,
    readonly available: number,
    readonly requested: number,
  ) {
    super(
      `Estoque insuficiente para a variação ${variantId}: ` +
        `disponível ${available}, solicitado ${requested}`,
    );
  }
}

export class CouponInvalidError extends DomainError {
  readonly code = "COUPON_INVALID";
}

export class CouponExpiredError extends DomainError {
  readonly code = "COUPON_EXPIRED";
}

export class PaymentDeclinedError extends DomainError {
  readonly code = "PAYMENT_DECLINED";
  override readonly httpStatus = 402;
}

export class InvalidOrderTransitionError extends DomainError {
  readonly code = "INVALID_ORDER_TRANSITION";
  override readonly httpStatus = 409;
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

/** Mensagens seguras para exibir ao usuário final. */
const USER_MESSAGES: Record<string, string> = {
  NOT_FOUND: "Não encontramos o que você procura.",
  UNAUTHORIZED: "Entre na sua conta para continuar.",
  FORBIDDEN: "Você não tem permissão para esta ação.",
  VALIDATION_ERROR: "Confira os dados informados.",
  INSUFFICIENT_STOCK: "Não temos essa quantidade disponível no momento.",
  COUPON_INVALID: "Cupom inválido.",
  COUPON_EXPIRED: "Este cupom não está mais válido.",
  PAYMENT_DECLINED: "O pagamento não foi aprovado. Tente outro meio de pagamento.",
  INVALID_ORDER_TRANSITION: "Não é possível alterar o pedido para este status.",
};

export function toUserMessage(error: unknown): string {
  if (isDomainError(error)) {
    return USER_MESSAGES[error.code] ?? "Não foi possível concluir a operação.";
  }
  return "Algo deu errado. Tente novamente em instantes.";
}
