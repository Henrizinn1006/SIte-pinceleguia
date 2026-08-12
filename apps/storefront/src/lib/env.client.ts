import { z } from "zod";

/**
 * Variáveis de ambiente SEGURAS PARA O NAVEGADOR.
 *
 * Só entram aqui variáveis `NEXT_PUBLIC_*`, que por definição são
 * públicas — o Next as substitui literalmente no bundle do cliente,
 * então qualquer visitante consegue lê-las no código-fonte da página.
 *
 * ⚠️ NUNCA adicione segredo aqui. Token de gateway, senha de banco e
 * chave de API ficam em `env.ts`, que é `server-only`.
 *
 * IMPORTANTE: as referências abaixo precisam ser literais
 * (`process.env.NEXT_PUBLIC_ALGO`). O Next só substitui o valor no
 * bundle se o nome estiver escrito por extenso — acesso dinâmico como
 * `process.env[chave]` resulta em `undefined` no navegador.
 */
const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_MP_PUBLIC_KEY: z.string().optional(),
});

export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  NEXT_PUBLIC_MP_PUBLIC_KEY: process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || undefined,
});
