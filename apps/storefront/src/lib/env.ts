import "server-only";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

/**
 * ⚠️ ESTE ARQUIVO É EXCLUSIVO DO SERVIDOR.
 *
 * O `import "server-only"` no topo faz o build QUEBRAR se algum Client
 * Component importar isto — direta ou indiretamente. É proposital: já
 * aconteceu de `site.ts` puxar este arquivo para dentro de um
 * componente com "use client", e aí a validação rodava no navegador,
 * onde DATABASE_URL não existe por definição. O erro resultante
 * ("DATABASE_URL não foi preenchida") apontava para o lugar errado e
 * custou horas.
 *
 * Client Components devem importar de `@/lib/env.client`.
 */

/**
 * Lê o .env DIRETO do disco, como rede de segurança.
 *
 * Por que isto existe: o carregamento automático de .env do Next se
 * mostrou instável neste projeto — ao reiniciar sozinho após uma
 * alteração de configuração, o processo subia sem as variáveis, e a
 * aplicação quebrava com "DATABASE_URL não preenchida" mesmo com o
 * arquivo intacto no disco.
 *
 * Regras:
 *  - NUNCA sobrescreve variável que já exista no ambiente. Em produção
 *    (Vercel) não há arquivo .env e as variáveis reais vêm do painel —
 *    esta função simplesmente não faz nada lá.
 *  - Falha em silêncio se o arquivo não existir. A validação abaixo é
 *    que decide se falta algo obrigatório.
 */
function loadEnvFile(): void {
  const file = path.join(process.cwd(), ".env");

  let content: string;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    return; // sem arquivo: usa só o que já está no ambiente
  }

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = line.slice(separator + 1).trim();

    // Remove aspas envolventes, se houver
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted && value.length >= 2) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile();

/**
 * Validação das variáveis de ambiente.
 *
 * A aplicação FALHA NO BOOT se faltar variável obrigatória — é melhor
 * quebrar no deploy do que na primeira compra. Ver docs/06-SEGURANCA.md
 *
 * Nenhum segredo deste arquivo chega ao navegador: apenas o objeto
 * `clientEnv` (NEXT_PUBLIC_*) pode ser importado por Client Components.
 */

/**
 * No `.env` é natural deixar uma variável ainda não usada como `VAR=""`.
 * Para o Node isso é uma string vazia, não uma variável ausente — e um
 * campo `.optional()` reprovaria, porque o valor "existe".
 *
 * Normalizamos antes de validar: string vazia (ou só espaços) = ausente.
 */
function normalize(source: NodeJS.ProcessEnv): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(source)) {
    const trimmed = value?.trim();
    result[key] = trimmed === "" ? undefined : trimmed;
  }
  return result;
}

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  DATABASE_URL: z
    .string({
      required_error:
        'não foi preenchida. Abra o arquivo .env na raiz do projeto e cole a connection string do seu Postgres em DATABASE_URL="".',
    })
    .url("precisa ser uma URL de conexão PostgreSQL válida (postgresql://...)"),

  DIRECT_URL: z.string().url().optional(),

  // FASE 3 — autenticação
  AUTH_SECRET: z.string().min(32, "precisa ter no mínimo 32 caracteres").optional(),
  AUTH_URL: z.string().url().optional(),

  // FASE 4 — pagamento
  MP_ACCESS_TOKEN: z.string().optional(),
  MP_WEBHOOK_SECRET: z.string().optional(),

  // FASE 4 — frete
  SHIPPING_PROVIDER: z.enum(["flat", "melhor-envio"]).default("flat"),
  MELHOR_ENVIO_TOKEN: z.string().optional(),
  MELHOR_ENVIO_SANDBOX: z.coerce.boolean().default(true),
  SHIPPING_ORIGIN_ZIPCODE: z.string().optional(),

  // FASE 5 — armazenamento de imagens
  STORAGE_PROVIDER: z.enum(["r2", "local"]).default("local"),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

  // FASE 4 — e-mail transacional
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  CRON_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

const BUILD_PLACEHOLDER_DB = "postgresql://build:build@localhost:5432/build";

function parseServerEnv() {
  const source = normalize(process.env);
  const parsed = serverSchema.safeParse(source);

  if (parsed.success) return parsed.data;

  const issues = parsed.error.issues
    .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  // Durante `next build` pode não haver banco configurado (ex.: CI).
  // Avisamos e seguimos; em runtime a falta de DATABASE_URL derruba a app.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    console.warn(`⚠️  Variáveis de ambiente incompletas no build:\n${issues}`);
    return serverSchema.parse({
      ...source,
      DATABASE_URL: source.DATABASE_URL ?? BUILD_PLACEHOLDER_DB,
    });
  }

  throw new Error(
    [
      "",
      "❌ Configuração de ambiente incompleta:",
      "",
      issues,
      "",
      "Como resolver:",
      "  1. Abra o arquivo .env na raiz do projeto",
      "  2. Preencha as variáveis listadas acima",
      "  3. Salve e reinicie o servidor (npm run dev)",
      "",
      "Precisa de um banco? Crie um grátis em https://neon.tech e cole",
      "a connection string em DATABASE_URL e DIRECT_URL.",
      "",
    ].join("\n"),
  );
}

export const env = parseServerEnv();

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
