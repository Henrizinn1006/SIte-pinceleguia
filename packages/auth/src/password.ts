import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";
import { promisify } from "node:util";

/**
 * `promisify` só enxerga uma das sobrecargas de `scrypt` e perde a que
 * aceita opções. O tipo explícito recupera a assinatura completa.
 */
const scryptAsync = promisify(scrypt) as (
  senha: string | Buffer,
  salt: string | Buffer,
  tamanhoDaChave: number,
  opcoes: ScryptOptions,
) => Promise<Buffer>;

/**
 * Hash de senha com scrypt.
 *
 * Por que scrypt e não argon2: scrypt vem no `node:crypto`, sem
 * dependência nativa para compilar. Uma biblioteca a menos é uma
 * superfície a menos — e, no Windows, um problema de instalação a
 * menos. scrypt é resistente a hardware dedicado e recomendado pelo
 * OWASP quando argon2 não está disponível.
 *
 * Parâmetros seguem a recomendação do OWASP para scrypt:
 * N=2^14, r=8, p=1 — ~16 MB de memória por verificação.
 */
const N = 16_384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MAX_MEM = 64 * 1024 * 1024;

const PREFIXO = "scrypt";

/**
 * Hash descartável usado quando o e-mail não existe.
 *
 * Sem isto, responder "não existe" instantaneamente e "senha errada"
 * após 100ms revela quais e-mails têm conta — enumeração por tempo.
 * Ver docs/06-SEGURANCA.md
 */
export const HASH_FALSO =
  "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" +
  "Y2hhdmVGYWxzYVBhcmFFcXVhbGl6YXJPVGVtcG9EYVZlcmlmaWNhY2FvRGVTZW5oYQ==";

export async function hashPassword(senha: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const chave = await scryptAsync(senha.normalize("NFKC"), salt, KEY_LENGTH, {
    N,
    r: R,
    p: P,
    maxmem: MAX_MEM,
  });

  return [
    PREFIXO,
    N,
    R,
    P,
    salt.toString("base64"),
    chave.toString("base64"),
  ].join("$");
}

/**
 * Verifica a senha em tempo constante.
 *
 * Retorna false para hash malformado em vez de lançar — um registro
 * corrompido no banco não deve derrubar o login de todo mundo.
 */
export async function verifyPassword(
  senha: string,
  hashArmazenado: string,
): Promise<boolean> {
  const partes = hashArmazenado.split("$");
  if (partes.length !== 6 || partes[0] !== PREFIXO) return false;

  const n = Number.parseInt(partes[1] ?? "", 10);
  const r = Number.parseInt(partes[2] ?? "", 10);
  const p = Number.parseInt(partes[3] ?? "", 10);
  const saltBase64 = partes[4];
  const chaveBase64 = partes[5];

  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
  if (!saltBase64 || !chaveBase64) return false;

  const salt = Buffer.from(saltBase64, "base64");
  const esperada = Buffer.from(chaveBase64, "base64");
  if (salt.length === 0 || esperada.length === 0) return false;

  let calculada: Buffer;
  try {
    calculada = await scryptAsync(senha.normalize("NFKC"), salt, esperada.length, {
      N: n,
      r,
      p,
      maxmem: MAX_MEM,
    });
  } catch {
    return false;
  }

  if (calculada.length !== esperada.length) return false;
  return timingSafeEqual(calculada, esperada);
}

/**
 * Consome o mesmo tempo de uma verificação real.
 * Chamar quando o e-mail não for encontrado.
 */
export async function gastarTempoDeVerificacao(): Promise<void> {
  await verifyPassword("senha-qualquer", HASH_FALSO);
}
