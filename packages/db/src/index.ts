import "server-only";
import { PrismaClient } from "@prisma/client";

/**
 * Cliente Prisma compartilhado pelos apps.
 *
 * ⚠️ `server-only`: se algum Client Component importar isto, o build
 * quebra. É proposital — ver docs/13.
 *
 * Singleton porque o hot reload do Next recria os módulos a cada
 * alteração; sem o cache global isso abriria uma conexão nova a cada
 * salvamento até esgotar o pool do banco.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const isDevelopment = process.env.NODE_ENV !== "production";

/**
 * Log de queries só quando pedido explicitamente — o SQL de cada
 * requisição afoga o terminal e esconde os erros que importam.
 *
 * Para ligar:  $env:PRISMA_LOG_QUERIES="true"; npm run dev
 */
const logQueries = process.env.PRISMA_LOG_QUERIES === "true";

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logQueries
      ? ["query", "warn", "error"]
      : isDevelopment
        ? ["warn", "error"]
        : ["error"],
  });

if (isDevelopment) globalForPrisma.prisma = db;

export type { Prisma } from "@prisma/client";
export { PrismaClient } from "@prisma/client";
