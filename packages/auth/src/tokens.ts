import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Tokens de sessão e de convite.
 *
 * O token puro só existe no cookie (ou no link do convite). O banco
 * guarda apenas o SHA-256 — assim, um vazamento do banco não entrega
 * sessões ativas ao atacante.
 *
 * SHA-256 sem key derivation é adequado aqui, ao contrário de senha:
 * o token tem 256 bits de entropia real e não é adivinhável por
 * força bruta. Senha precisa de scrypt justamente porque é fraca.
 */
const TAMANHO_TOKEN_BYTES = 32;

export function gerarToken(): string {
  return randomBytes(TAMANHO_TOKEN_BYTES).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Comparação em tempo constante de dois hashes hexadecimais. */
export function tokensIguais(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
