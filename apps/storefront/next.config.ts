import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

/**
 * Carrega o .env da RAIZ do monorepo.
 *
 * Sem isto o Next só enxergaria um .env dentro de apps/storefront, e
 * teríamos que duplicar credenciais em cada app. Um arquivo só, na raiz,
 * serve os dois apps e o Prisma. `loadEnvConfig` é a API que o próprio
 * Next expõe para este caso.
 */
const raizDoMonorepo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
loadEnvConfig(raizDoMonorepo);

/**
 * Headers de segurança aplicados a todas as respostas.
 * Ver docs/06-SEGURANCA.md
 *
 * NOTA: a CSP ainda NÃO inclui os domínios do Mercado Pago. Será
 * estendida na FASE 8, quando o checkout for implementado.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  /** Pacotes do monorepo são TypeScript cru — o Next precisa transpilar. */
  transpilePackages: ["@vortexis/commerce", "@vortexis/db", "@vortexis/ui"],

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "**.cloudflarestorage.com" },
    ],
  },

  // Rotas tipadas: `href` inválido vira erro de compilação, não 404 em produção.
  typedRoutes: true,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
