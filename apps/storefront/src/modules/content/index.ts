import "server-only";
import { z } from "zod";
import { db } from "@vortexis/db";

/**
 * Conteúdo e configuração editáveis pelo admin.
 *
 * O hero da home, o rodapé e as páginas institucionais vêm daqui —
 * é isso que permite o cliente mudar texto e imagem SEM deploy.
 * Ver docs/03-MODELO-DADOS.md (Setting, ContentPage)
 */

// --- Schemas das configurações conhecidas -----------------------------

const heroSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  tagline: z.string(),
  ctaLabel: z.string(),
  ctaHref: z.string(),
  imageUrl: z.string(),
  imageAlt: z.string(),
});

const featuredTitleSchema = z.object({
  title: z.string(),
  linkLabel: z.string(),
});

const storeContactSchema = z.object({
  email: z.string().nullable(),
  whatsapp: z.string().nullable(),
  instagram: z.string().nullable(),
  legalName: z.string().nullable(),
  document: z.string().nullable(),
});

export type Hero = z.infer<typeof heroSchema>;
export type StoreContact = z.infer<typeof storeContactSchema>;

/**
 * Fallbacks usados quando o banco ainda não tem a configuração.
 * Mantêm a home renderizável antes do seed rodar.
 */
const HERO_FALLBACK: Hero = {
  title: "Pincel & Guia",
  subtitle: "Porcelana autoral feita à mão",
  tagline: "Arte, fé e ancestralidade em cada peça",
  ctaLabel: "Conheça a coleção",
  ctaHref: "/loja",
  imageUrl: "/demo/hero.svg",
  imageAlt: "Composição com peças de porcelana pintadas à mão",
};

async function getSetting<T>(key: string, schema: z.ZodType<T>, fallback: T): Promise<T> {
  try {
    const row = await db.setting.findUnique({ where: { key } });
    if (!row) return fallback;
    const parsed = schema.safeParse(row.value);
    return parsed.success ? parsed.data : fallback;
  } catch {
    // Banco indisponível (ex.: build sem DATABASE_URL) — degrada com elegância.
    return fallback;
  }
}

export function getHero(): Promise<Hero> {
  return getSetting("home.hero", heroSchema, HERO_FALLBACK);
}

export function getFeaturedTitle() {
  return getSetting("home.featuredTitle", featuredTitleSchema, {
    title: "Peças em destaque",
    linkLabel: "Ver todas",
  });
}

export function getStoreContact(): Promise<StoreContact> {
  return getSetting("store.contact", storeContactSchema, {
    email: null,
    whatsapp: null,
    instagram: null,
    legalName: null,
    document: null,
  });
}

// --- Páginas institucionais -------------------------------------------

export async function getContentPage(slug: string) {
  return db.contentPage.findFirst({
    where: { slug, isPublished: true },
    select: {
      slug: true,
      title: true,
      content: true,
      metaTitle: true,
      metaDescription: true,
      isPlaceholder: true,
      updatedAt: true,
    },
  });
}

export async function getAllContentPageSlugs(): Promise<
  { slug: string; updatedAt: Date }[]
> {
  return db.contentPage.findMany({
    where: { isPublished: true },
    select: { slug: true, updatedAt: true },
  });
}
