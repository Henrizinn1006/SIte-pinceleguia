import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

/** Mesmo .env da raiz que serve o storefront e o Prisma. Ver storefront/next.config.ts */
const raizDoMonorepo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
loadEnvConfig(raizDoMonorepo);

/**
 * Headers do painel — mais restritivos que os da loja.
 * O admin controla estoque, preço e pedidos. Ver docs/13.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Painel administrativo nunca deve aparecer em buscador.
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  transpilePackages: [
    "@vortexis/auth",
    "@vortexis/commerce",
    "@vortexis/db",
    "@vortexis/ui",
  ],

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "**.cloudflarestorage.com" },
    ],
  },

  typedRoutes: true,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
